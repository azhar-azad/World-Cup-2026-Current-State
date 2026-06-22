"use client";

import type { BracketMatch, Match, MatchStatus } from "@wc26/core";
import { teamsById } from "@wc26/data";
import Link from "next/link";
import { useState } from "react";
import type { AppData } from "@/lib/appData";
import type { MatchUpdate } from "@/lib/store";
import { Flag } from "./TeamLabel";
import { STAGE_LABEL, fmtKickoff } from "./format";
import { useLiveData } from "./useLiveData";

type Filter = "all" | "group" | "ko" | "live" | "unplayed";

interface Side {
  teamId: string | null;
  label: string;
}

function sideOf(
  m: Match,
  which: "home" | "away",
  bracketByNo: Map<number, BracketMatch>,
): Side {
  const direct = which === "home" ? m.homeTeam : m.awayTeam;
  if (direct) return { teamId: direct, label: direct };
  const b = bracketByNo.get(m.matchNo);
  if (b) {
    const p = which === "home" ? b.home : b.away;
    return { teamId: p.teamId, label: p.label };
  }
  return { teamId: null, label: "TBD" };
}

function SideName({ side }: { side: Side }) {
  if (!side.teamId) {
    return <span className="text-neutral-500 italic">{side.label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag teamId={side.teamId} size={16} />
      {teamsById.get(side.teamId)?.name ?? side.teamId}
    </span>
  );
}

const STATUSES: MatchStatus[] = ["scheduled", "live", "finished"];

export function AdminPanel({ initial }: { initial: AppData }) {
  const { data, connected, apply } = useLiveData(initial);
  const [filter, setFilter] = useState<Filter>("live");
  const [busy, setBusy] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  const bracketByNo = new Map(data.bracket.map((b) => [b.matchNo, b]));

  async function patch(matchNo: number, body: MatchUpdate) {
    setBusy(matchNo);
    try {
      const res = await fetch(`/api/matches/${matchNo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) apply((await res.json()) as AppData);
    } finally {
      setBusy(null);
    }
  }

  async function resetAll() {
    if (!confirm("Reset all matches back to the seeded data?")) return;
    const res = await fetch("/api/reset", { method: "POST" });
    if (res.ok) apply((await res.json()) as AppData);
  }

  let matches = data.matches;
  if (filter === "group") matches = matches.filter((m) => m.stage === "group");
  else if (filter === "ko") matches = matches.filter((m) => m.stage !== "group");
  else if (filter === "live") matches = matches.filter((m) => m.status === "live");
  else if (filter === "unplayed")
    matches = matches.filter((m) => m.status !== "finished");
  matches = [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Admin · match events</h1>
          <p className="text-sm text-neutral-400">
            Set status, record goals — standings &amp; bracket update live.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-neutral-400">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-neutral-600"}`}
            />
            {connected ? "Live" : "Offline"}
          </span>
          <button
            onClick={resetAll}
            className="text-sm rounded-md border border-red-500/40 text-red-300 px-3 py-1.5 hover:bg-red-500/10"
          >
            Reset
          </button>
          <Link
            href="/"
            className="text-sm rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="flex gap-2 mb-4 text-sm">
        {(["live", "unplayed", "group", "ko", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 border ${
              filter === f
                ? "border-white/40 bg-white/10"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            {f === "ko" ? "Knockout" : f[0]!.toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {matches.length === 0 && (
          <p className="text-neutral-500 text-sm py-6">No matches match this filter.</p>
        )}
        {matches.map((m) => {
          const home = sideOf(m, "home", bracketByNo);
          const away = sideOf(m, "away", bracketByNo);
          const tag =
            m.stage === "group"
              ? `Group ${m.group}`
              : STAGE_LABEL[m.stage] ?? m.stage;
          const isDrawKo =
            m.stage !== "group" &&
            m.status === "finished" &&
            m.homeScore === m.awayScore;
          const disabled = busy === m.matchNo;

          return (
            <div
              key={m.id}
              className="rounded-lg border border-white/10 bg-neutral-900/60 p-3"
            >
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2">
                <span>
                  M{m.matchNo} · {tag}
                </span>
                <span>{fmtKickoff(m.kickoff)}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Home */}
                <div className="flex items-center justify-end gap-2">
                  <SideName side={home} />
                  <Stepper
                    value={m.homeScore}
                    onAdd={() =>
                      patch(m.matchNo, {
                        addGoal: { side: "home", minute: minNum(minutes, m.id, "home") },
                      })
                    }
                    onSub={() => patch(m.matchNo, { removeGoalId: lastGoalId(m, home.teamId, "home") })}
                    disabled={disabled}
                  />
                </div>

                <div className="text-center text-xs text-neutral-500">vs</div>

                {/* Away */}
                <div className="flex items-center gap-2">
                  <Stepper
                    value={m.awayScore}
                    onAdd={() =>
                      patch(m.matchNo, {
                        addGoal: { side: "away", minute: minNum(minutes, m.id, "away") },
                      })
                    }
                    onSub={() => patch(m.matchNo, { removeGoalId: lastGoalId(m, away.teamId, "away") })}
                    disabled={disabled}
                  />
                  <SideName side={away} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={disabled}
                      onClick={() => patch(m.matchNo, { status: s })}
                      className={`text-xs rounded px-2 py-1 border ${
                        m.status === s
                          ? "border-white/40 bg-white/10"
                          : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>min</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="H"
                    className="w-12 rounded bg-neutral-800 px-1 py-0.5 text-center"
                    value={minutes[`${m.id}-home`] ?? ""}
                    onChange={(e) =>
                      setMinutes((p) => ({ ...p, [`${m.id}-home`]: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="A"
                    className="w-12 rounded bg-neutral-800 px-1 py-0.5 text-center"
                    value={minutes[`${m.id}-away`] ?? ""}
                    onChange={(e) =>
                      setMinutes((p) => ({ ...p, [`${m.id}-away`]: e.target.value }))
                    }
                  />
                </div>
              </div>

              {isDrawKo && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Penalty winner:</span>
                  {[home, away].map(
                    (s) =>
                      s.teamId && (
                        <button
                          key={s.teamId}
                          disabled={disabled}
                          onClick={() => patch(m.matchNo, { winnerTeam: s.teamId })}
                          className={`rounded px-2 py-1 border ${
                            m.winnerTeam === s.teamId
                              ? "border-emerald-500/60 bg-emerald-500/10"
                              : "border-white/10 hover:bg-white/5"
                          }`}
                        >
                          {teamsById.get(s.teamId)?.name ?? s.teamId}
                        </button>
                      ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function minNum(
  minutes: Record<string, string>,
  matchId: string,
  side: "home" | "away",
): number | undefined {
  const raw = minutes[`${matchId}-${side}`];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function lastGoalId(
  m: Match,
  teamId: string | null,
  side: "home" | "away",
): string {
  // The most recently added goal on this side (by team id, or by the side
  // sentinel used for not-yet-resolved knockout participants).
  for (let i = m.goals.length - 1; i >= 0; i--) {
    const g = m.goals[i]!;
    if (g.team === teamId || g.team === side) return g.id;
  }
  return "";
}

function Stepper({
  value,
  onAdd,
  onSub,
  disabled,
}: {
  value: number;
  onAdd: () => void;
  onSub: () => void;
  disabled: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={onSub}
        disabled={disabled || value <= 0}
        className="h-6 w-6 rounded border border-white/15 disabled:opacity-30 hover:bg-white/5"
      >
        −
      </button>
      <span className="w-5 text-center font-semibold tabular-nums">{value}</span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="h-6 w-6 rounded border border-white/15 hover:bg-white/5"
      >
        +
      </button>
    </span>
  );
}
