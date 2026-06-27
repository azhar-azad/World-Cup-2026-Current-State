"use client";

import type { AppData } from "@/lib/appData";
import { useLiveData } from "./useLiveData";
import { GroupTable } from "./GroupTable";
import { ThirdPlaceTable } from "./ThirdPlaceTable";

export function GroupsClient({ initial }: { initial: AppData }) {
  const { data } = useLiveData(initial);
  const qualifyingThirds = new Set(
    data.thirdPlace.filter((r) => r.position <= 8).map((r) => r.teamId),
  );
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.groups.map((g) => (
          <GroupTable key={g.group} ranking={g} qualifyingThirds={qualifyingThirds} />
        ))}
      </div>
      <div>
        <h2 className="text-lg font-bold mb-3">Third-placed teams</h2>
        <ThirdPlaceTable rows={data.thirdPlace} />
      </div>
    </div>
  );
}
