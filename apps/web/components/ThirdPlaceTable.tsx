"use client";

import Link from "next/link";
import type { RankedThird } from "@wc26/core";
import { teamsById } from "@wc26/data";
import { Flag } from "./TeamLabel";

const NUM = "px-2 py-1.5 text-right tabular-nums";

/** The 12 third-placed teams ranked; the top 8 (above the cut line) advance. */
export function ThirdPlaceTable({ rows }: { rows: RankedThird[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/60 overflow-hidden max-w-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h3 className="font-semibold text-sm">Third-placed teams</h3>
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
          Top 8 advance
        </span>
      </div>
      <table className="w-full text-xs">
        <thead className="text-neutral-500">
          <tr className="border-b border-white/5">
            <th className="px-2 py-1.5 text-left font-medium w-6">#</th>
            <th className="px-2 py-1.5 text-left font-medium">Team</th>
            <th className="px-2 py-1.5 text-left font-medium">Grp</th>
            <th className={NUM + " font-medium"}>MP</th>
            <th className={NUM + " font-medium"}>GD</th>
            <th className={NUM + " font-medium text-neutral-300"}>Pts</th>
            <th className={NUM + " font-medium"} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const qualifies = r.position <= 8;
            return (
              <tr
                key={r.teamId}
                className={`border-b border-white/5 last:border-0 ${
                  qualifies
                    ? "border-l-2 border-emerald-500"
                    : "border-l-2 border-transparent opacity-60"
                }`}
              >
                <td className="px-2 py-1.5 text-neutral-500">{r.position}</td>
                <td className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-2">
                    <Flag teamId={r.teamId} size={16} />
                    <Link
                      href={`/team/${r.teamId}`}
                      className="truncate hover:text-white transition-colors"
                    >
                      {teamsById.get(r.teamId)?.name ?? r.teamId}
                    </Link>
                    {r.unresolvedTie && (
                      <span title="Level on on-pitch criteria — decided by FIFA ranking / lots" className="text-amber-400">
                        *
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-neutral-400">{r.group}</td>
                <td className={NUM}>{r.played}</td>
                <td className={NUM}>
                  {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                </td>
                <td className={NUM + " font-semibold text-neutral-100"}>
                  {r.points}
                </td>
                <td className={NUM}>
                  {qualifies ? (
                    <span className="text-emerald-400 font-semibold">Q</span>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[10px] text-neutral-500 border-t border-white/10">
        Provisional — ranked by current standings; the cut line after 8th updates live.
      </p>
    </div>
  );
}
