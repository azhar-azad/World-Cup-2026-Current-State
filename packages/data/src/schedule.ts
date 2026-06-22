import type { Goal, Match } from "@wc26/core";
import raw from "./data/matches.json";

interface RawGoal {
  team: string | null;
  minute: number | null;
}
interface RawMatch extends Omit<Match, "goals" | "winnerTeam"> {
  goals: RawGoal[];
}

/**
 * The seeded 104-match schedule. Group matches that had already been played at
 * seed time carry their real scores (status "finished"); everything else is
 * "scheduled". Knockout participants are left unresolved — the bracket engine
 * derives them from results.
 */
export const schedule: Match[] = (raw as RawMatch[]).map((m) => {
  const goals: Goal[] = m.goals.map((g, i) => ({
    id: `${m.id}-g${i}`,
    team: g.team ?? "",
    minute: g.minute ?? undefined,
  }));
  return { ...m, goals, winnerTeam: null } satisfies Match;
});
