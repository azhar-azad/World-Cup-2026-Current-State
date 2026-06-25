import { Redis } from "@upstash/redis";
import { buildSnapshot } from "@wc26/core";
import { bracketTemplate, groupTeams, schedule, teams } from "@wc26/data";
import { store } from "@/lib/store";
import {
  fetchWC2026Matches,
  fdTlaToId,
  fdStatusToInternal,
} from "@/lib/footballData";
import { SYNC_MAX_PER_WINDOW, SYNC_WINDOW_SECONDS } from "@/lib/syncConstants";
import { thirdPlaceAllocation } from "@/lib/annexeC";

const RATE_LIMIT_KEY = "wc26:sync:window";

// Static pair map for group-stage matches (teams are known upfront).
const GROUP_PAIR_TO_MATCH_NO = new Map<string, number>(
  schedule
    .filter((m) => m.stage === "group" && m.homeTeam && m.awayTeam)
    .map((m) => [`${m.homeTeam}:${m.awayTeam}`, m.matchNo]),
);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

async function checkRateLimit(): Promise<RateLimitResult> {
  if (!process.env.KV_REST_API_URL) {
    return { allowed: true, remaining: SYNC_MAX_PER_WINDOW - 1, resetIn: SYNC_WINDOW_SECONDS };
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN!,
  });

  const count = await redis.incr(RATE_LIMIT_KEY);
  if (count === 1) await redis.expire(RATE_LIMIT_KEY, SYNC_WINDOW_SECONDS);
  const ttl = await redis.ttl(RATE_LIMIT_KEY);
  const resetIn = Math.max(0, ttl);

  if (count > SYNC_MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining: SYNC_MAX_PER_WINDOW - count, resetIn };
}

export async function POST() {
  const rateLimit = await checkRateLimit();

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded", remaining: 0, resetIn: rateLimit.resetIn },
      { status: 429 },
    );
  }

  let fdMatches;
  try {
    fdMatches = await fetchWC2026Matches();
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }

  const { matches: currentMatches } = await store.getState();

  // Resolve the bracket from current standings so we know which teams are
  // slotted into each knockout match, then build a dynamic pair map for them.
  const snapshot = buildSnapshot({
    groupTeams,
    bracketTemplate,
    matches: currentMatches,
    teams,
    thirdPlaceAllocation,
    provisional: true,
    includeLive: true,
  });
  const koPairToMatchNo = new Map<string, number>();
  for (const bm of snapshot.bracket) {
    if (bm.home.teamId && bm.away.teamId) {
      koPairToMatchNo.set(`${bm.home.teamId}:${bm.away.teamId}`, bm.matchNo);
    }
  }

  let updated = 0;

  for (const fdm of fdMatches) {
    const newStatus = fdStatusToInternal(fdm.status);
    if (!newStatus || newStatus === "scheduled") continue;

    const homeId = fdTlaToId(fdm.homeTeam.tla);
    const awayId = fdTlaToId(fdm.awayTeam.tla);
    if (!homeId || !awayId) continue;

    const matchNo =
      GROUP_PAIR_TO_MATCH_NO.get(`${homeId}:${awayId}`) ??
      koPairToMatchNo.get(`${homeId}:${awayId}`);
    if (!matchNo) continue;

    const existing = currentMatches.find((m) => m.matchNo === matchNo);
    if (!existing) continue;

    // For extra-time matches use the AET score; fall back to full-time.
    const scoreSource =
      fdm.score.extraTime?.home != null ? fdm.score.extraTime : fdm.score.fullTime;
    const fdHome = scoreSource.home ?? 0;
    const fdAway = scoreSource.away ?? 0;

    // Penalty shootout: derive the explicit winner from score.winner.
    let winnerTeam: string | null | undefined;
    if (
      newStatus === "finished" &&
      fdm.score.duration === "PENALTY_SHOOTOUT" &&
      fdm.score.winner
    ) {
      winnerTeam =
        fdm.score.winner === "HOME_TEAM"
          ? homeId
          : fdm.score.winner === "AWAY_TEAM"
            ? awayId
            : null;
    }

    const needsUpdate =
      existing.status !== newStatus ||
      existing.homeScore !== fdHome ||
      existing.awayScore !== fdAway ||
      (winnerTeam !== undefined && existing.winnerTeam !== winnerTeam);

    if (!needsUpdate) continue;

    await store.update(matchNo, {
      status: newStatus,
      homeScore: fdHome,
      awayScore: fdAway,
      ...(winnerTeam !== undefined && { winnerTeam }),
    });
    updated++;
  }

  return Response.json({
    ok: true,
    updated,
    remaining: rateLimit.remaining,
    resetIn: rateLimit.resetIn,
    syncedAt: new Date().toISOString(),
  });
}
