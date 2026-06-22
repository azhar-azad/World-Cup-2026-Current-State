import type { GroupId, Team } from "@wc26/core";
import raw from "./data/teams.json";

/** A seeded team: core Team fields plus tournament metadata. */
export interface SeedTeam extends Team {
  group: GroupId;
  confed?: string;
  /** Flag emoji, used as a graceful fallback if the flag image fails to load. */
  flagEmoji?: string;
}

export const teams: SeedTeam[] = raw as SeedTeam[];

export const teamsById: Map<string, SeedTeam> = new Map(
  teams.map((t) => [t.id, t]),
);

export function teamName(id: string): string {
  return teamsById.get(id)?.name ?? id;
}
