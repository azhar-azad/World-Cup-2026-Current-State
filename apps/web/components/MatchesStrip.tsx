"use client";

import Link from "next/link";
import type { BracketMatch, Match } from "@wc26/core";
import { teamsById } from "@wc26/data";
import type { MatchStake, TeamStake } from "@/lib/stakes";
import { Flag } from "./TeamLabel";
import { STAGE_LABEL, fmtKickoff } from "./format";

function stakeLabel(s: TeamStake): { text: string; color: string } | null {
  if (s.alreadyClinched) return { text: "Already through", color: "text-emerald-400" };
  if (s.alreadyEliminated) return { text: "Cannot advance", color: "text-red-400" };
  if (s.clinchesWithDraw) return { text: "Through with a draw", color: "text-emerald-400" };
  if (s.clinchesWithWin && s.eliminatedIfLose) return { text: "Must win", color: "text-amber-400" };
  if (s.clinchesWithWin) return { text: "Through with a win", color: "text-emerald-400" };
  if (s.eliminatedIfLose && s.couldAdvanceWithDraw) return { text: "Must avoid defeat", color: "text-amber-400" };
  if (s.eliminatedIfLose) return { text: "Need a win + results", color: "text-amber-400" };
  if (s.couldAdvanceWithWin) return { text: "In contention", color: "text-neutral-400" };
  return null;
}

function StakeLine({ stake, name }: { stake: TeamStake; name: string }) {
  const label = stakeLabel(stake);
  if (!label) return null;
  return (
    <div className="flex items-baseline gap-1 text-[10px] leading-tight">
      <span className="text-neutral-500 shrink-0 truncate max-w-[60px]">{name}:</span>
      <span className={label.color}>{label.text}</span>
    </div>
  );
}

interface Side {
  teamId: string | null;
  label: string;
}

function resolveSide(
  match: Match,
  which: "home" | "away",
  bracketByNo: Map<number, BracketMatch>,
): Side {
  const direct = which === "home" ? match.homeTeam : match.awayTeam;
  if (direct) return { teamId: direct, label: direct };
  const b = bracketByNo.get(match.matchNo);
  if (b) {
    const p = which === "home" ? b.home : b.away;
    return { teamId: p.teamId, label: p.label };
  }
  return { teamId: null, label: "TBD" };
}

function SideView({ side, align }: { side: Side; align: "left" | "right" }) {
  const team = side.teamId ? teamsById.get(side.teamId) : undefined;
  const content = side.teamId ? (
    <>
      <Flag teamId={side.teamId} size={18} />
      <Link
        href={`/team/${side.teamId}`}
        className="truncate hover:text-white transition-colors"
      >
        {team?.name ?? side.teamId}
      </Link>
    </>
  ) : (
    <span className="text-neutral-500 italic truncate">{side.label}</span>
  );
  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {content}
    </div>
  );
}

function MatchCard({
  match,
  bracketByNo,
  stake,
}: {
  match: Match;
  bracketByNo: Map<number, BracketMatch>;
  stake?: MatchStake;
}) {
  const home = resolveSide(match, "home", bracketByNo);
  const away = resolveSide(match, "away", bracketByNo);
  const tag =
    match.stage === "group"
      ? `Group ${match.group}`
      : STAGE_LABEL[match.stage] ?? match.stage;

  const isLive = match.status === "live";

  const center: React.ReactNode =
    match.status === "scheduled" ? (
      <span className="text-xs text-neutral-400 whitespace-nowrap">vs</span>
    ) : (
      <span className="font-semibold tabular-nums whitespace-nowrap">
        {match.homeScore}
        <span className="text-neutral-500"> : </span>
        {match.awayScore}
      </span>
    );

  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        isLive
          ? "border-red-500/60 bg-red-950/20 shadow-[inset_2px_0_0_0_rgb(239,68,68)]"
          : "border-white/10 bg-neutral-900/60"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
          {tag}
        </span>
        {isLive ? (
          <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        ) : match.status === "scheduled" ? (
          <span className="text-[10px] text-neutral-400">
            {fmtKickoff(match.kickoff)}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <SideView side={home} align="right" />
        <div className="px-2">{center}</div>
        <SideView side={away} align="left" />
      </div>
      {stake && match.stage === "group" && (
        <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-col gap-0.5">
          <StakeLine
            stake={stake.homeStake}
            name={home.teamId ? (teamsById.get(home.teamId)?.name ?? home.teamId) : home.label}
          />
          <StakeLine
            stake={stake.awayStake}
            name={away.teamId ? (teamsById.get(away.teamId)?.name ?? away.teamId) : away.label}
          />
        </div>
      )}
    </div>
  );
}

export function MatchesStrip({
  matches,
  bracket,
  stakes = [],
}: {
  matches: Match[];
  bracket: BracketMatch[];
  stakes?: MatchStake[];
}) {
  const bracketByNo = new Map(bracket.map((b) => [b.matchNo, b]));
  const stakeByMatchId = new Map(stakes.map((s) => [s.matchId, s]));

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const past = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));

  const upcomingList = [...live, ...upcoming];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Column title={`Upcoming${live.length ? ` · ${live.length} live` : ""}`}>
        {upcomingList.length === 0 && <Empty>No upcoming matches</Empty>}
        {upcomingList.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            bracketByNo={bracketByNo}
            stake={stakeByMatchId.get(m.id)}
          />
        ))}
      </Column>
      <Column title="Past">
        {past.length === 0 && <Empty>No matches played yet</Empty>}
        {past.map((m) => (
          <MatchCard key={m.id} match={m} bracketByNo={bracketByNo} />
        ))}
      </Column>
    </div>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-950/40">
      <div className="px-3 py-2 border-b border-white/10 text-sm font-semibold">
        {title}
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-2 space-y-2">
        {children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500 px-2 py-4">{children}</p>;
}
