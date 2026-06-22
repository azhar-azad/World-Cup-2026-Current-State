"use client";

import type { GroupRanking } from "@wc26/core";
import { teamsById } from "@wc26/data";
import { Flag } from "./TeamLabel";

// Left accent by qualification status: top 2 advance directly; 3rd may advance
// as a best third-placed team; 4th is eliminated.
function accent(position: number): string {
  if (position <= 2) return "border-l-2 border-emerald-500";
  if (position === 3) return "border-l-2 border-amber-500";
  return "border-l-2 border-transparent";
}

const NUM = "px-2 py-1.5 text-right tabular-nums";

export function GroupTable({ ranking }: { ranking: GroupRanking }) {
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
            <th className={NUM.replace("text-right", "text-right") + " font-medium"}>MP</th>
            <th className={NUM + " font-medium"}>W</th>
            <th className={NUM + " font-medium"}>D</th>
            <th className={NUM + " font-medium"}>L</th>
            <th className={NUM + " font-medium"}>GF</th>
            <th className={NUM + " font-medium"}>GA</th>
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
                className={`border-b border-white/5 last:border-0 ${accent(r.position)}`}
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
                <td className={NUM}>{r.won}</td>
                <td className={NUM}>{r.drawn}</td>
                <td className={NUM}>{r.lost}</td>
                <td className={NUM}>{r.goalsFor}</td>
                <td className={NUM}>{r.goalsAgainst}</td>
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
    </div>
  );
}
