"use client";

import { useState } from "react";
import type { AppData } from "@/lib/appData";
import { useLiveData } from "./useLiveData";
import { Bracket } from "./Bracket";

function Spinner() {
  return (
    <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
  );
}

export function KnockoutClient({ initial }: { initial: AppData }) {
  const { data, apply } = useLiveData(initial);
  const [simulating, setSimulating] = useState(false);
  const [reverting, setReverting] = useState(false);

  const unplayed = data.bracket.filter((b) => b.status === "scheduled").length;
  const busy = simulating || reverting;

  async function callAndApply(url: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      apply(await res.json() as AppData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-neutral-500">
          {unplayed > 0
            ? `${unplayed} match${unplayed !== 1 ? "es" : ""} yet to be played`
            : "All matches decided"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {unplayed > 0 && (
            <button
              onClick={() => callAndApply("/api/simulate", setSimulating)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/10"
            >
              {simulating && <Spinner />}
              {simulating ? "Simulating…" : "Simulate remaining (FIFA ranking)"}
            </button>
          )}
          <button
            onClick={() => callAndApply("/api/reset", setReverting)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-100 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/10"
          >
            {reverting && <Spinner />}
            {reverting ? "Resetting…" : "Reset to real results"}
          </button>
        </div>
      </div>
      <Bracket bracket={data.bracket} />
    </div>
  );
}
