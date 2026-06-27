"use client";

import Link from "next/link";
import type { AppData } from "@/lib/appData";
import { teamsById } from "@wc26/data";
import { useLiveData } from "./useLiveData";
import { Flag } from "./TeamLabel";
import { STAGE_LABEL } from "./format";

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{label}</div>
    </div>
  );
}

function SectionCard({
  href,
  title,
  description,
  count,
  countLabel,
}: {
  href: string;
  title: string;
  description: string;
  count?: number | string;
  countLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-white/20 transition-all p-5 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-semibold text-white">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-neutral-500">
            {count} {countLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-neutral-400">{description}</p>
      <span className="text-xs text-neutral-600 group-hover:text-neutral-300 transition-colors mt-auto pt-1">
        View →
      </span>
    </Link>
  );
}

export function LiveDashboard({ initial }: { initial: AppData }) {
  const { data } = useLiveData(initial);

  const played = data.matches.filter((m) => m.status === "finished").length;
  const live = data.matches.filter((m) => m.status === "live").length;
  const remaining = data.matches.filter((m) => m.status === "scheduled").length;
  const goals = data.matches.reduce(
    (s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0,
  );
  const groupsDone = data.groups.filter((g) => g.complete).length;

  const featuredMatches =
    live > 0
      ? data.matches.filter((m) => m.status === "live")
      : data.matches
          .filter((m) => m.status === "finished")
          .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
          .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">FIFA World Cup 2026</h1>
        <p className="text-neutral-400 mt-1">USA · Canada · Mexico</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={played} label="Played" />
        <StatCard
          value={live > 0 ? live : remaining}
          label={live > 0 ? "Live now" : "Remaining"}
        />
        <StatCard value={goals} label="Goals" />
        <StatCard value={`${groupsDone} / 12`} label="Groups done" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SectionCard
          href="/groups"
          title="Group Stage"
          description="Standings for all 12 groups and third-place rankings"
          count={data.groups.length}
          countLabel="groups"
        />
        <SectionCard
          href="/matches"
          title="Matches"
          description="Upcoming fixtures and past results"
          count={played}
          countLabel="played"
        />
        <SectionCard
          href="/knockout"
          title="Knockout"
          description="Round of 32 through to the Final bracket"
        />
      </div>

      {featuredMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            {live > 0 ? "Live now" : "Recent results"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {featuredMatches.map((m) => {
              const homeTeam = m.homeTeam ? teamsById.get(m.homeTeam) : null;
              const awayTeam = m.awayTeam ? teamsById.get(m.awayTeam) : null;
              const stageLabel =
                m.stage === "group"
                  ? `Group ${m.group}`
                  : (STAGE_LABEL[m.stage] ?? m.stage);
              return (
                <div
                  key={m.id}
                  className={`rounded-md border px-3 py-2 ${
                    m.status === "live"
                      ? "border-red-500/60 bg-red-950/20"
                      : "border-white/10 bg-neutral-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                      {stageLabel}
                    </span>
                    {m.status === "live" && (
                      <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      {m.homeTeam && <Flag teamId={m.homeTeam} size={16} />}
                      {m.homeTeam ? (
                        <Link
                          href={`/team/${m.homeTeam}`}
                          className="truncate text-neutral-300 hover:text-white transition-colors"
                        >
                          {homeTeam?.name ?? m.homeTeam}
                        </Link>
                      ) : (
                        <span className="truncate text-neutral-500 italic">TBD</span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums px-1 text-center">
                      {m.homeScore ?? 0}
                      <span className="text-neutral-500"> : </span>
                      {m.awayScore ?? 0}
                    </span>
                    <div className="flex items-center gap-1.5 justify-end">
                      {m.awayTeam ? (
                        <Link
                          href={`/team/${m.awayTeam}`}
                          className="truncate text-neutral-300 hover:text-white transition-colors text-right"
                        >
                          {awayTeam?.name ?? m.awayTeam}
                        </Link>
                      ) : (
                        <span className="truncate text-neutral-500 italic">TBD</span>
                      )}
                      {m.awayTeam && <Flag teamId={m.awayTeam} size={16} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
