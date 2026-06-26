import {
  buildSnapshot,
  type BracketMatch,
  type BracketParticipant,
  type GroupRanking,
  type Match,
  type RankedThird,
} from "@wc26/core";
import { bracketTemplate, groupTeams, teams } from "@wc26/data";
import { store } from "./store";
import { thirdPlaceAllocation } from "./annexeC";
import { computeClinched, computeClinchedPositions } from "./clinched";
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
  const { clinchedFirst, clinchedSecond } = computeClinchedPositions(snapshot.groups);

  // Clear the provisional flag only when the team has clinched their specific
  // bracket position, not just advancement. A team can clinch advancement while
  // their 1st-vs-2nd order is still undecided (e.g. two teams level on points
  // with a head-to-head match still to play).
  const clearProvisional = (p: BracketParticipant): BracketParticipant => {
    if (!p.teamId || !p.provisional) return p;
    const positionLocked =
      (p.source.kind === "groupWinner" && clinchedFirst.has(p.teamId)) ||
      (p.source.kind === "groupRunnerUp" && clinchedSecond.has(p.teamId));
    return positionLocked ? { ...p, provisional: false } : p;
  };

  const bracket = snapshot.bracket.map((bm) => ({
    ...bm,
    home: clearProvisional(bm.home),
    away: clearProvisional(bm.away),
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
