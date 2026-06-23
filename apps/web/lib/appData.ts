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
  return {
    version,
    matches,
    groups: snapshot.groups,
    bracket: snapshot.bracket,
    thirdPlace: snapshot.thirdPlace,
  };
}
