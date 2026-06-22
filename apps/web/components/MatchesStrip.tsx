"use client";

import type { BracketMatch, Match } from "@wc26/core";
import { teamsById } from "@wc26/data";
import { Flag } from "./TeamLabel";
import { STAGE_LABEL, fmtKickoff } from "./format";

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
      <span className="truncate">{team?.name ?? side.teamId}</span>
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
}: {
  match: Match;
  bracketByNo: Map<number, BracketMatch>;
}) {
  const home = resolveSide(match, "home", bracketByNo);
  const away = resolveSide(match, "away", bracketByNo);
  const tag =
    match.stage === "group"
      ? `Group ${match.group}`
      : STAGE_LABEL[match.stage] ?? match.stage;

  let center: React.ReactNode;
  if (match.status === "scheduled") {
    center = (
      <span className="text-[11px] text-neutral-400 whitespace-nowrap">
        {fmtKickoff(match.kickoff)}
      </span>
    );
  } else {
    center = (
      <span className="font-semibold tabular-nums whitespace-nowrap">
        {match.homeScore}<span className="text-neutral-500"> : </span>{match.awayScore}
      </span>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-neutral-900/60 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
          {tag}
        </span>
        {match.status === "live" && (
          <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <SideView side={home} align="right" />
        <div className="px-2">{center}</div>
        <SideView side={away} align="left" />
      </div>
    </div>
  );
}

export function MatchesStrip({
  matches,
  bracket,
}: {
  matches: Match[];
  bracket: BracketMatch[];
}) {
  const bracketByNo = new Map(bracket.map((b) => [b.matchNo, b]));

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
          <MatchCard key={m.id} match={m} bracketByNo={bracketByNo} />
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
