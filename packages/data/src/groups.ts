import { GROUP_IDS, type GroupId } from "@wc26/core";
import { teams } from "./teams";

/** Group id -> the four team ids in that group. */
export const groupTeams: Record<GroupId, string[]> = (() => {
  const map = Object.fromEntries(GROUP_IDS.map((g) => [g, [] as string[]])) as
    Record<GroupId, string[]>;
  for (const t of teams) map[t.group].push(t.id);
  return map;
})();
