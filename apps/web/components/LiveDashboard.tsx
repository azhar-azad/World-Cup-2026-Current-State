"use client";

import Link from "next/link";
import type { AppData } from "@/lib/appData";
import { Bracket } from "./Bracket";
import { GroupTable } from "./GroupTable";
import { MatchesStrip } from "./MatchesStrip";
import { ThirdPlaceTable } from "./ThirdPlaceTable";
import { useLiveData } from "./useLiveData";
import { SyncButton } from "./SyncButton";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold mb-3 mt-8 first:mt-0">{children}</h2>
  );
}

export function LiveDashboard({ initial }: { initial: AppData }) {
  const { data, connected } = useLiveData(initial);
  const qualifyingThirds = new Set(
    data.thirdPlace.filter((r) => r.position <= 8).map((r) => r.teamId),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            FIFA World Cup 2026
          </h1>
          <p className="text-sm text-neutral-400">
            Live standings, fixtures &amp; knockout bracket
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-xs text-neutral-400">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-neutral-600"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </span>
          <SyncButton />
          <Link
            href="/admin"
            className="text-sm rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5"
          >
            Admin
          </Link>
        </div>
      </header>

      <SectionHeading>Groups</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.groups.map((g) => (
          <GroupTable key={g.group} ranking={g} qualifyingThirds={qualifyingThirds} />
        ))}
      </div>

      <SectionHeading>Matches</SectionHeading>
      <MatchesStrip matches={data.matches} bracket={data.bracket} />

      <SectionHeading>Third-placed teams</SectionHeading>
      <ThirdPlaceTable rows={data.thirdPlace} />

      <SectionHeading>Knockout bracket</SectionHeading>
      <p className="text-xs text-neutral-500 -mt-2 mb-3">
        Boxes show current leaders. <span className="italic text-neutral-400">Italic with an amber dot</span> = provisional
        (not yet clinched). Third-place slot assignments are a computed matching, pending the official Annexe C allocation.
      </p>
      <Bracket bracket={data.bracket} />
    </main>
  );
}
