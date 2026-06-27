"use client";

import Link from "next/link";
import type { AppData } from "@/lib/appData";
import { teamsById } from "@wc26/data";
import { useLiveData } from "./useLiveData";
import { Flag } from "./TeamLabel";
import { STAGE_LABEL, fmtKickoff } from "./format";

const STAGE_ORDER: Record<string, number> = {
  R32: 1, R16: 2, QF: 3, SF: 4, third: 4.5, final: 5,
};

type Status = { label: string; color: string; sub?: string };

function getStatus(teamId: string, data: AppData): Status {
  const group = data.groups.find((g) => g.rows.some((r) => r.teamId === teamId));
  const groupRow = group?.rows.find((r) => r.teamId === teamId);

  const bracketMatches = data.bracket.filter(
    (bm) => bm.home.teamId === teamId || bm.away.teamId === teamId,
  );

  if (bracketMatches.length === 0) {
    if (!group || !groupRow) return { label: "Unknown", color: "text-neutral-400" };
    if (!group.complete) {
      return {
        label: `Group ${group.group}`,
        sub: `Position ${groupRow.position} · ${groupRow.points} pts`,
        color: "text-neutral-300",
      };
    }
    return {
      label: "Eliminated",
      sub: `Group Stage · Group ${group.group}`,
      color: "text-red-400",
    };
  }

  const sorted = [...bracketMatches].sort(
    (a, b) => (STAGE_ORDER[b.stage] ?? 0) - (STAGE_ORDER[a.stage] ?? 0),
  );

  // Walk from the highest stage down; first decided loss = exit point
  for (const bm of sorted) {
    if (bm.winner !== null) {
      if (bm.winner !== teamId) {
        if (bm.stage === "final") return { label: "Runner-up", color: "text-neutral-300" };
        const stageName = STAGE_LABEL[bm.stage] ?? bm.stage;
        return { label: "Eliminated", sub: stageName, color: "text-red-400" };
      }
      if (bm.stage === "final") return { label: "Champion 🏆", color: "text-amber-400" };
    }
  }

  // Still active — show highest undecided stage
  const active = sorted.find((bm) => bm.winner === null) ?? sorted[0];
  const stageName = STAGE_LABEL[active.stage] ?? active.stage;
  return { label: stageName, color: "text-emerald-400" };
}

interface MatchEntry {
  matchNo: number;
  stage: string;
  group?: string | null;
  kickoff: string;
  status: string;
  opponentId: string | null;
  opponentLabel: string;
  teamScore: number | null;
  opponentScore: number | null;
  winner?: string | null;
}

function buildMatchEntries(teamId: string, data: AppData): MatchEntry[] {
  const matchByNo = new Map(data.matches.map((m) => [m.matchNo, m]));
  const entries: MatchEntry[] = [];

  for (const m of data.matches) {
    if (m.stage !== "group") continue;
    if (m.homeTeam !== teamId && m.awayTeam !== teamId) continue;
    const isHome = m.homeTeam === teamId;
    const opponentId = (isHome ? m.awayTeam : m.homeTeam) ?? null;
    entries.push({
      matchNo: m.matchNo,
      stage: "group",
      group: m.group,
      kickoff: m.kickoff,
      status: m.status,
      opponentId,
      opponentLabel: opponentId ?? "TBD",
      teamScore: isHome ? m.homeScore : m.awayScore,
      opponentScore: isHome ? m.awayScore : m.homeScore,
    });
  }

  for (const bm of data.bracket) {
    if (bm.home.teamId !== teamId && bm.away.teamId !== teamId) continue;
    const isHome = bm.home.teamId === teamId;
    const opponent = isHome ? bm.away : bm.home;
    const match = matchByNo.get(bm.matchNo);
    entries.push({
      matchNo: bm.matchNo,
      stage: bm.stage,
      kickoff: match?.kickoff ?? "",
      status: bm.status,
      opponentId: opponent.teamId,
      opponentLabel: opponent.label,
      teamScore: isHome ? bm.homeScore : bm.awayScore,
      opponentScore: isHome ? bm.awayScore : bm.homeScore,
      winner: bm.winner,
    });
  }

  return entries.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

function resultBadge(
  entry: MatchEntry,
  teamId: string,
): { label: string; color: string } | null {
  if (entry.status !== "finished") return null;
  if (entry.winner !== undefined && entry.winner !== null) {
    return entry.winner === teamId
      ? { label: "W", color: "bg-emerald-500/20 text-emerald-400" }
      : { label: "L", color: "bg-red-500/20 text-red-400" };
  }
  if (entry.winner === null && entry.stage !== "group") {
    return { label: "D", color: "bg-neutral-700/40 text-neutral-400" };
  }
  const ts = entry.teamScore ?? 0;
  const os = entry.opponentScore ?? 0;
  if (ts > os) return { label: "W", color: "bg-emerald-500/20 text-emerald-400" };
  if (ts < os) return { label: "L", color: "bg-red-500/20 text-red-400" };
  return { label: "D", color: "bg-neutral-700/40 text-neutral-400" };
}

function MatchRow({ entry, teamId }: { entry: MatchEntry; teamId: string }) {
  const result = resultBadge(entry, teamId);
  const stageLabel =
    entry.stage === "group"
      ? `Group ${entry.group}`
      : (STAGE_LABEL[entry.stage] ?? entry.stage);
  const opponent = entry.opponentId ? teamsById.get(entry.opponentId) : null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm ${
        entry.status === "live"
          ? "border-red-500/60 bg-red-950/20"
          : "border-white/10 bg-neutral-900/60"
      }`}
    >
      <div className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-neutral-500">
        {stageLabel}
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-neutral-500 shrink-0">vs</span>
        {entry.opponentId ? (
          <>
            <Flag teamId={entry.opponentId} size={16} />
            <Link
              href={`/team/${entry.opponentId}`}
              className="truncate text-neutral-300 hover:text-white transition-colors"
            >
              {opponent?.name ?? entry.opponentId}
            </Link>
          </>
        ) : (
          <span className="text-neutral-500 italic truncate">{entry.opponentLabel}</span>
        )}
      </div>

      <div className="shrink-0 w-24 text-right">
        {entry.status === "scheduled" ? (
          <span className="text-[10px] text-neutral-400">
            {entry.kickoff ? fmtKickoff(entry.kickoff) : "TBD"}
          </span>
        ) : entry.status === "live" ? (
          <span className="font-semibold tabular-nums">
            {entry.teamScore ?? 0}
            <span className="text-neutral-500"> : </span>
            {entry.opponentScore ?? 0}
            <span className="ml-1.5 text-[10px] text-red-400">LIVE</span>
          </span>
        ) : (
          <span className="font-semibold tabular-nums">
            {entry.teamScore ?? 0}
            <span className="text-neutral-500"> : </span>
            {entry.opponentScore ?? 0}
          </span>
        )}
      </div>

      <div className="shrink-0 w-7 flex justify-center">
        {result && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${result.color}`}>
            {result.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function TeamView({ teamId, initial }: { teamId: string; initial: AppData }) {
  const { data } = useLiveData(initial);
  const team = teamsById.get(teamId);
  const status = getStatus(teamId, data);
  const entries = buildMatchEntries(teamId, data);

  const group = data.groups.find((g) => g.rows.some((r) => r.teamId === teamId));
  const groupRow = group?.rows.find((r) => r.teamId === teamId);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-5">
        <Flag teamId={teamId} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{team?.name ?? teamId}</h1>
          {group && (
            <p className="text-sm text-neutral-400 mt-0.5">
              Group {group.group}
              {groupRow && ` · Position ${groupRow.position}`}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
            {status.sub && <span className="text-xs text-neutral-500">· {status.sub}</span>}
          </div>
        </div>
      </div>

      {/* Group stats */}
      {groupRow && (
        <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2.5">
            Group {group?.group} Standing
          </div>
          <div className="flex items-center gap-5 text-center flex-wrap">
            {[
              { val: groupRow.position, label: "Pos" },
              { val: groupRow.points, label: "Pts" },
              { val: groupRow.played, label: "MP" },
              { val: `${groupRow.won}W ${groupRow.drawn}D ${groupRow.lost}L`, label: "Record" },
              {
                val:
                  groupRow.goalDifference > 0
                    ? `+${groupRow.goalDifference}`
                    : groupRow.goalDifference,
                label: "GD",
              },
              { val: `${groupRow.goalsFor}–${groupRow.goalsAgainst}`, label: "Goals" },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="font-bold tabular-nums">{val}</div>
                <div className="text-[10px] text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
          Matches
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-500">No matches found.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <MatchRow key={e.matchNo} entry={e} teamId={teamId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
