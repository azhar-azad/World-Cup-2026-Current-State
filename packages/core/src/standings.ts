import type { Match, MatchStatus, StandingRow } from "./types";

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

export interface StandingsOptions {
  /**
   * When true, matches that are currently `live` are counted at their current
   * scoreline (a provisional table). When false, only `finished` matches count.
   * Defaults to true.
   */
  includeLive?: boolean;
}

function emptyRow(teamId: string): StandingRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function countsForStanding(status: MatchStatus, includeLive: boolean): boolean {
  if (status === "finished") return true;
  if (status === "live" && includeLive) return true;
  return false;
}

function applyResult(
  row: StandingRow,
  scored: number,
  conceded: number,
): void {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  if (scored > conceded) {
    row.won += 1;
    row.points += POINTS_WIN;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += POINTS_DRAW;
  } else {
    row.lost += 1;
  }
  row.goalDifference = row.goalsFor - row.goalsAgainst;
}

/**
 * Aggregate a league table for the given teams over the given matches.
 *
 * Only matches whose both participants are in `teamIds` contribute, so the same
 * function works for a full group table or for a head-to-head "mini-table"
 * across an arbitrary subset of teams.
 */
export function computeStandings(
  teamIds: readonly string[],
  matches: readonly Match[],
  options: StandingsOptions = {},
): StandingRow[] {
  const includeLive = options.includeLive ?? true;
  const teamSet = new Set(teamIds);
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) rows.set(id, emptyRow(id));

  for (const match of matches) {
    if (!countsForStanding(match.status, includeLive)) continue;
    const { homeTeam, awayTeam } = match;
    if (!homeTeam || !awayTeam) continue;
    if (!teamSet.has(homeTeam) || !teamSet.has(awayTeam)) continue;

    const home = rows.get(homeTeam)!;
    const away = rows.get(awayTeam)!;
    applyResult(home, match.homeScore, match.awayScore);
    applyResult(away, match.awayScore, match.homeScore);
  }

  return [...rows.values()];
}
