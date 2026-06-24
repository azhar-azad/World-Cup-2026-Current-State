"use client";

import type { GroupRanking } from "@wc26/core";
import { teamsById } from "@wc26/data";
import { Flag } from "./TeamLabel";

function rowClass(position: number, isQualifyingThird: boolean): string {
  if (position <= 2)
    return "border-l-2 border-emerald-500 bg-emerald-500/[0.06]";
  if (position === 3 && isQualifyingThird)
    return "border-l-2 border-amber-400 bg-amber-400/[0.06]";
  return "border-l-2 border-transparent";
}

const NUM = "px-2 py-1.5 text-right tabular-nums";

export function GroupTable({
  ranking,
  qualifyingThirds,
}: {
  ranking: GroupRanking;
  qualifyingThirds: Set<string>;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h3 className="font-semibold text-sm">Group {ranking.group}</h3>
        {!ranking.complete && (
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">
            In progress
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <thead className="text-neutral-500">
          <tr className="border-b border-white/5">
            <th className="px-2 py-1.5 text-left font-medium w-6">#</th>
            <th className="px-2 py-1.5 text-left font-medium">Team</th>
            <th className={NUM + " font-medium"}>MP</th>
            <th className={NUM + " font-medium hidden sm:table-cell"}>W</th>
            <th className={NUM + " font-medium hidden sm:table-cell"}>D</th>
            <th className={NUM + " font-medium hidden sm:table-cell"}>L</th>
            <th className={NUM + " font-medium hidden sm:table-cell"}>GF</th>
            <th className={NUM + " font-medium hidden sm:table-cell"}>GA</th>
            <th className={NUM + " font-medium"}>GD</th>
            <th className={NUM + " font-medium text-neutral-300"}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((r) => {
            const team = teamsById.get(r.teamId);
            return (
              <tr
                key={r.teamId}
                className={`last:border-0 ${rowClass(r.position, qualifyingThirds.has(r.teamId))} ${
                  r.position === 2
                    ? "border-b border-white/20"
                    : "border-b border-white/5"
                }`}
              >
                <td className="px-2 py-1.5 text-neutral-500">{r.position}</td>
                <td className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-2">
                    <Flag teamId={r.teamId} size={18} />
                    <span className="truncate">{team?.name ?? r.teamId}</span>
                    {r.unresolvedTie && (
                      <span
                        title="Level on all on-pitch criteria — order decided by FIFA ranking / drawing of lots"
                        className="text-amber-400"
                      >
                        *
                      </span>
                    )}
                  </span>
                </td>
                <td className={NUM}>{r.played}</td>
                <td className={NUM + " hidden sm:table-cell"}>{r.won}</td>
                <td className={NUM + " hidden sm:table-cell"}>{r.drawn}</td>
                <td className={NUM + " hidden sm:table-cell"}>{r.lost}</td>
                <td className={NUM + " hidden sm:table-cell"}>{r.goalsFor}</td>
                <td className={NUM + " hidden sm:table-cell"}>{r.goalsAgainst}</td>
                <td className={NUM}>
                  {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                </td>
                <td className={NUM + " font-semibold text-neutral-100"}>
                  {r.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-white/5 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-0.5 rounded-full bg-emerald-500 inline-block" />
          Advances
        </span>
        {ranking.rows.some(
          (r) => r.position === 3 && qualifyingThirds.has(r.teamId),
        ) && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-0.5 rounded-full bg-amber-400 inline-block" />
            Best 3rd
          </span>
        )}
      </div>
    </div>
  );
}
