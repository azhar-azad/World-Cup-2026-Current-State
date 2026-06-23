import { Redis } from "@upstash/redis";
import { schedule } from "@wc26/data";
import { store } from "@/lib/store";
import {
  fetchWC2026Matches,
  fdTlaToId,
  fdStatusToInternal,
} from "@/lib/footballData";
import { SYNC_SYNC_MAX_PER_WINDOW, SYNC_SYNC_WINDOW_SECONDS } from "@/lib/syncConstants";

const RATE_LIMIT_KEY = "wc26:sync:window";

// (homeTeamId:awayTeamId) → matchNo for all group-stage matches.
// Knockout slots aren't known until groups resolve, so those stay manual.
const PAIR_TO_MATCH_NO = new Map<string, number>(
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
    // Local dev — no Redis, skip rate limiting.
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
  let updated = 0;

  for (const fdm of fdMatches) {
    const newStatus = fdStatusToInternal(fdm.status);
    if (!newStatus || newStatus === "scheduled") continue;

    const homeId = fdTlaToId(fdm.homeTeam.tla);
    const awayId = fdTlaToId(fdm.awayTeam.tla);
    if (!homeId || !awayId) continue;

    const matchNo = PAIR_TO_MATCH_NO.get(`${homeId}:${awayId}`);
    if (!matchNo) continue;

    const existing = currentMatches.find((m) => m.matchNo === matchNo);
    if (!existing) continue;

    const fdHome = fdm.score.fullTime.home ?? 0;
    const fdAway = fdm.score.fullTime.away ?? 0;

    const needsUpdate =
      existing.status !== newStatus ||
      existing.homeScore !== fdHome ||
      existing.awayScore !== fdAway;

    if (!needsUpdate) continue;

    await store.update(matchNo, {
      status: newStatus,
      homeScore: fdHome,
      awayScore: fdAway,
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
