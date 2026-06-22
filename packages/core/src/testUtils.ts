import type { GroupId, Match, MatchStatus, Stage } from "./types";

/** Build a finished (or otherwise) group match. matchNo auto-increments. */
let auto = 0;
export function gm(
  group: GroupId,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  status: MatchStatus = "finished",
): Match {
  auto += 1;
  return {
    id: `G${auto}`,
    matchNo: auto,
    stage: "group",
    group,
    homeTeam: home,
    awayTeam: away,
    kickoff: "2026-06-15T18:00:00Z",
    status,
    homeScore,
    awayScore,
    goals: [],
  };
}

/** Build a knockout match with an explicit match number. */
export function km(
  matchNo: number,
  stage: Stage,
  homeScore: number,
  awayScore: number,
  status: MatchStatus = "finished",
  winnerTeam?: string | null,
): Match {
  return {
    id: `M${matchNo}`,
    matchNo,
    stage,
    kickoff: "2026-07-01T18:00:00Z",
    status,
    homeScore,
    awayScore,
    goals: [],
    winnerTeam: winnerTeam ?? null,
  };
}
