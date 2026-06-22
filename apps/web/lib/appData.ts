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

/** Everything the dashboard and admin need in one serializable payload. */
export interface AppData {
  version: number;
  matches: Match[];
  groups: GroupRanking[];
  bracket: BracketMatch[];
  thirdPlace: RankedThird[];
}

export function getAppData(): AppData {
  const matches = store.getMatches();
  const snapshot = buildSnapshot({
    groupTeams,
    bracketTemplate,
    matches,
    teams,
    thirdPlaceAllocation,
    provisional: true,
    includeLive: true,
  });
  return {
    version: store.version,
    matches,
    groups: snapshot.groups,
    bracket: snapshot.bracket,
    thirdPlace: snapshot.thirdPlace,
  };
}
