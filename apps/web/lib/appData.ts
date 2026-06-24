import {
  buildSnapshot,
  type BracketMatch,
  type GroupRanking,
  type Match,
  type RankedThird,
} from "@wc26/core";
import { bracketTemplate, groupTeams, teams } from "@wc26/data";
import { store } from "./store";
import { thirdPlaceAllocation } from "./annexeC";
import { computeClinched } from "./clinched";
import { computeMatchStakes, type MatchStake } from "./stakes";

/** Everything the dashboard and admin need in one serializable payload. */
export interface AppData {
  version: number;
  matches: Match[];
  groups: GroupRanking[];
  bracket: BracketMatch[];
  thirdPlace: RankedThird[];
  /** Team IDs that have mathematically clinched a top-2 group finish. */
  clinched: string[];
  /** Per-match stakes for upcoming group-stage fixtures. */
  stakes: MatchStake[];
}

export async function getAppData(): Promise<AppData> {
  const { version, matches } = await store.getState();
  const snapshot = buildSnapshot({
    groupTeams,
    bracketTemplate,
    matches,
    teams,
    thirdPlaceAllocation,
    provisional: true,
    includeLive: true,
  });

  const clinched = computeClinched(snapshot.groups);

  // Clear the provisional flag on bracket slots whose team has clinched —
  // their position is no longer tentative.
  const bracket = snapshot.bracket.map((bm) => ({
    ...bm,
    home:
      bm.home.teamId && clinched.has(bm.home.teamId)
        ? { ...bm.home, provisional: false }
        : bm.home,
    away:
      bm.away.teamId && clinched.has(bm.away.teamId)
        ? { ...bm.away, provisional: false }
        : bm.away,
  }));

  const stakes = computeMatchStakes(
    snapshot.groups,
    groupTeams as Record<string, string[]>,
    matches,
    clinched,
    teams,
  );

  return {
    version,
    matches,
    groups: snapshot.groups,
    bracket,
    thirdPlace: snapshot.thirdPlace,
    clinched: [...clinched],
    stakes,
  };
}
