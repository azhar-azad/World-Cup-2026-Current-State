"use client";

import type { AppData } from "@/lib/appData";
import { useLiveData } from "./useLiveData";
import { MatchesStrip } from "./MatchesStrip";

export function MatchesClient({ initial }: { initial: AppData }) {
  const { data } = useLiveData(initial);
  return (
    <MatchesStrip
      matches={data.matches}
      bracket={data.bracket}
      stakes={data.stakes}
    />
  );
}
