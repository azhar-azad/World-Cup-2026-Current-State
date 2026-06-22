"use client";

import type { BracketMatch, BracketParticipant, Stage } from "@wc26/core";
import { teamsById } from "@wc26/data";
import { Flag } from "./TeamLabel";

const ROUNDS: { stage: Stage; title: string }[] = [
  { stage: "R32", title: "Round of 32" },
  { stage: "R16", title: "Round of 16" },
  { stage: "QF", title: "Quarter-finals" },
  { stage: "SF", title: "Semi-finals" },
  { stage: "final", title: "Final" },
];

function ParticipantRow({
  p,
  isWinner,
  score,
  decided,
}: {
  p: BracketParticipant;
  isWinner: boolean;
  score: number | null;
  decided: boolean;
}) {
  const team = p.teamId ? teamsById.get(p.teamId) : undefined;
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1 ${
        decided && !isWinner ? "opacity-50" : ""
      }`}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {p.teamId ? (
          <>
            <Flag teamId={p.teamId} size={16} />
            <span
              className={`truncate ${isWinner ? "font-semibold" : ""} ${
                p.provisional ? "italic text-neutral-400" : ""
              }`}
              title={
                p.provisional
                  ? `${p.label} — provisional (current standings, not yet clinched)`
                  : undefined
              }
            >
              {team?.name ?? p.teamId}
            </span>
            {p.provisional && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500/80 shrink-0"
                title="Provisional"
              />
            )}
          </>
        ) : (
          <span className="truncate text-neutral-500 italic">{p.label}</span>
        )}
      </span>
      {score !== null && (
        <span className="tabular-nums text-neutral-300">{score}</span>
      )}
    </div>
  );
}

function BracketCard({ m }: { m: BracketMatch }) {
  const decided = m.winner !== null;
  const showScore = m.status !== "scheduled";
  return (
    <div className="rounded-md border border-white/10 bg-neutral-900/60 text-xs w-48 shrink-0">
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[9px] text-neutral-600">M{m.matchNo}</span>
        {m.status === "live" && (
          <span className="text-[9px] font-semibold text-red-400">LIVE</span>
        )}
      </div>
      <ParticipantRow
        p={m.home}
        isWinner={m.winner === m.home.teamId && decided}
        score={showScore ? m.homeScore : null}
        decided={decided}
      />
      <div className="border-t border-white/5" />
      <ParticipantRow
        p={m.away}
        isWinner={m.winner === m.away.teamId && decided}
        score={showScore ? m.awayScore : null}
        decided={decided}
      />
    </div>
  );
}

export function Bracket({ bracket }: { bracket: BracketMatch[] }) {
  const byStage = (stage: Stage) =>
    bracket
      .filter((m) => m.stage === stage)
      .sort((a, b) => a.matchNo - b.matchNo);
  const thirdPlace = bracket.find((m) => m.stage === "third");

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {ROUNDS.map(({ stage, title }) => (
          <div key={stage} className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-neutral-400 sticky top-0">
              {title}
            </h4>
            <div className="flex flex-col gap-2 justify-around h-full">
              {byStage(stage).map((m) => (
                <BracketCard key={m.matchNo} m={m} />
              ))}
              {stage === "final" && thirdPlace && (
                <div className="mt-2">
                  <h4 className="text-xs font-semibold text-neutral-400 mb-1">
                    Third place
                  </h4>
                  <BracketCard m={thirdPlace} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
