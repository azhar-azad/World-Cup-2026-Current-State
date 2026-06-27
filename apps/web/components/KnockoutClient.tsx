"use client";

import type { AppData } from "@/lib/appData";
import { useLiveData } from "./useLiveData";
import { Bracket } from "./Bracket";

export function KnockoutClient({ initial }: { initial: AppData }) {
  const { data } = useLiveData(initial);
  return <Bracket bracket={data.bracket} />;
}
