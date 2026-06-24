import { buildGroupRanking } from "@wc26/core";
import type { GroupId, GroupRanking, Match, Team } from "@wc26/core";

type Outcome = "home_win" | "draw" | "away_win";
const ALL_OUTCOMES: Outcome[] = ["home_win", "draw", "away_win"];

export interface TeamStake {
  teamId: string;
  alreadyClinched: boolean;
  alreadyEliminated: boolean;
  /** Guaranteed top-2 regardless of other results, if they win. */
  clinchesWithWin: boolean;
  /** Guaranteed top-2 regardless of other results, if they at least draw. */
  clinchesWithDraw: boolean;
  /** Top-2 possible with a win (may need other results to go their way). */
  couldAdvanceWithWin: boolean;
  /** Top-2 possible with a draw (may need help). */
  couldAdvanceWithDraw: boolean;
  /** Top-2 still possible even if they lose. */
  couldAdvanceWithLoss: boolean;
  /** Cannot finish top-2 if they lose, in any scenario. */
  eliminatedIfLose: boolean;
}

export interface MatchStake {
  matchId: string;
  homeStake: TeamStake;
  awayStake: TeamStake;
}

function syntheticMatch(m: Match, outcome: Outcome): Match {
  const [hs, as_] =
    outcome === "home_win" ? [1, 0] : outcome === "draw" ? [0, 0] : [0, 1];
  return { ...m, status: "finished" as const, homeScore: hs, awayScore: as_ };
}

function qualifiesTop2(
  teamId: string,
  groupId: GroupId,
  teamIds: string[],
  matches: Match[],
  teams?: readonly Team[],
): boolean {
  const ranking = buildGroupRanking(groupId, teamIds, matches, {
    includeLive: false,
    teams,
  });
  return (ranking.rows.find((r) => r.teamId === teamId)?.position ?? 99) <= 2;
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays as [T[], ...T[][]];
  const restCombos = cartesian(rest);
  return first.flatMap((item) => restCombos.map((combo) => [item, ...combo]));
}

function computeTeamStake(
  teamId: string,
  groupId: GroupId,
  teamIds: string[],
  finishedMatches: Match[],
  targetMatch: Match,
  otherUpcoming: Match[],
  otherCombos: Outcome[][],
  clinched: Set<string>,
  teams?: readonly Team[],
): TeamStake {
  const isHome = targetMatch.homeTeam === teamId;
  const teamWinOutcome: Outcome = isHome ? "home_win" : "away_win";
  const teamLoseOutcome: Outcome = isHome ? "away_win" : "home_win";

  const checks: Record<Outcome, { all: boolean; some: boolean }> = {
    home_win: { all: true, some: false },
    draw: { all: true, some: false },
    away_win: { all: true, some: false },
  };

  for (const targetOutcome of ALL_OUTCOMES) {
    const targetSynthetic = syntheticMatch(targetMatch, targetOutcome);
    for (const combo of otherCombos) {
      const otherSynthetics = otherUpcoming.map((m, i) =>
        syntheticMatch(m, combo[i]!),
      );
      const allMatches = [
        ...finishedMatches,
        targetSynthetic,
        ...otherSynthetics,
      ];
      const q = qualifiesTop2(teamId, groupId, teamIds, allMatches, teams);
      if (!q) checks[targetOutcome].all = false;
      if (q) checks[targetOutcome].some = true;
    }
  }

  return {
    teamId,
    alreadyClinched: clinched.has(teamId),
    alreadyEliminated:
      !checks.home_win.some && !checks.draw.some && !checks.away_win.some,
    clinchesWithWin: checks[teamWinOutcome].all,
    clinchesWithDraw: checks.draw.all,
    couldAdvanceWithWin: checks[teamWinOutcome].some,
    couldAdvanceWithDraw: checks.draw.some,
    couldAdvanceWithLoss: checks[teamLoseOutcome].some,
    eliminatedIfLose: !checks[teamLoseOutcome].some,
  };
}

/**
 * For every upcoming group-stage match, compute the mathematical stakes for
 * each team by simulating all possible outcome combinations across remaining
 * group matches.
 */
export function computeMatchStakes(
  groups: GroupRanking[],
  groupTeams: Record<string, string[]>,
  allMatches: Match[],
  clinched: Set<string>,
  teams?: readonly Team[],
): MatchStake[] {
  const result: MatchStake[] = [];

  for (const group of groups) {
    if (group.complete) continue;
    const groupId = group.group;
    const teamIds = groupTeams[groupId] ?? [];

    const groupMatches = allMatches.filter(
      (m) => m.stage === "group" && m.group === groupId,
    );
    const finishedMatches = groupMatches.filter(
      (m) => m.status === "finished",
    );
    const upcomingMatches = groupMatches.filter(
      (m) => m.status === "scheduled" || m.status === "live",
    );

    for (const targetMatch of upcomingMatches) {
      if (!targetMatch.homeTeam || !targetMatch.awayTeam) continue;

      const otherUpcoming = upcomingMatches.filter(
        (m) => m.id !== targetMatch.id,
      );
      const otherCombos = cartesian<Outcome>(
        otherUpcoming.map(() => ALL_OUTCOMES),
      );

      result.push({
        matchId: targetMatch.id,
        homeStake: computeTeamStake(
          targetMatch.homeTeam,
          groupId,
          teamIds,
          finishedMatches,
          targetMatch,
          otherUpcoming,
          otherCombos,
          clinched,
          teams,
        ),
        awayStake: computeTeamStake(
          targetMatch.awayTeam,
          groupId,
          teamIds,
          finishedMatches,
          targetMatch,
          otherUpcoming,
          otherCombos,
          clinched,
          teams,
        ),
      });
    }
  }

  return result;
}
