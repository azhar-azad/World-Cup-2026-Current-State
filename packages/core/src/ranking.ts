import { computeStandings } from "./standings";
import type {
  GroupId,
  GroupRanking,
  Match,
  RankedRow,
  StandingRow,
  Team,
} from "./types";

export interface RankOptions {
  /** Team metadata, used for the FIFA-ranking tiebreaker (criterion g). */
  teams?: readonly Team[];
  /** Count live matches at current score (provisional table). Defaults to true. */
  includeLive?: boolean;
}

/** Group consecutive items that share the same key, preserving order. */
function partition<T>(items: readonly T[], key: (item: T) => string): T[][] {
  const out: T[][] = [];
  let current: T[] = [];
  let currentKey: string | null = null;
  for (const item of items) {
    const k = key(item);
    if (k !== currentKey) {
      if (current.length) out.push(current);
      current = [];
      currentKey = k;
    }
    current.push(item);
  }
  if (current.length) out.push(current);
  return out;
}

/** Compare two table rows: more points, then GD, then goals scored (best first). */
function compareTable(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }
  return b.goalsFor - a.goalsFor;
}

/**
 * Article 13 Step 2 tail + Step 3: rank a set of teams that the head-to-head
 * mini-table could not separate, using overall criteria:
 *   d) superior overall goal difference
 *   e) greater number of overall goals scored
 *   f) fair-play points  — SKIPPED (no card data; see plan "Known gaps")
 *   g) FIFA/Coca-Cola World Ranking (lower is better)
 *   h) drawing of lots   — deterministic stable fallback (by team id)
 *
 * Any teams that remain level through (e) — i.e. separated only by FIFA ranking
 * or lots — are recorded in `unresolved`, since their order is not decided on
 * the pitch.
 */
function rankByOverall(
  set: readonly string[],
  overall: Map<string, StandingRow>,
  teams: Map<string, Team>,
  unresolved: Set<string>,
): string[] {
  const sorted = [...set].sort((a, b) => {
    const ra = overall.get(a)!;
    const rb = overall.get(b)!;
    if (rb.goalDifference !== ra.goalDifference) {
      return rb.goalDifference - ra.goalDifference; // d
    }
    if (rb.goalsFor !== ra.goalsFor) return rb.goalsFor - ra.goalsFor; // e
    // f) fair play skipped
    const fa = teams.get(a)?.fifaRanking ?? Number.MAX_SAFE_INTEGER; // g
    const fb = teams.get(b)?.fifaRanking ?? Number.MAX_SAFE_INTEGER;
    if (fa !== fb) return fa - fb;
    return a < b ? -1 : a > b ? 1 : 0; // h
  });

  // Flag teams that share identical overall (GD, GF): only g/h could split them.
  const byOnPitchKey = new Map<string, string[]>();
  for (const t of set) {
    const r = overall.get(t)!;
    const key = `${r.goalDifference}|${r.goalsFor}`;
    const bucket = byOnPitchKey.get(key);
    if (bucket) bucket.push(t);
    else byOnPitchKey.set(key, [t]);
  }
  for (const bucket of byOnPitchKey.values()) {
    if (bucket.length > 1) for (const t of bucket) unresolved.add(t);
  }

  return sorted;
}

/**
 * Article 13 Step 1 + Step 2 head-to-head recursion for a set of teams that are
 * level on points. Builds a mini-table from only the matches *between* the teams
 * in `set` and orders by (h2h points, h2h GD, h2h goals). Where that splits the
 * set, each resulting sub-group is re-evaluated among its own members only
 * ("applied to the matches between the remaining teams only"). Where it cannot
 * split the set at all, falls through to the overall criteria.
 */
function breakTie(
  set: readonly string[],
  matches: readonly Match[],
  overall: Map<string, StandingRow>,
  teams: Map<string, Team>,
  includeLive: boolean,
  unresolved: Set<string>,
): string[] {
  if (set.length <= 1) return [...set];

  const mini = computeStandings(set, matches, { includeLive });
  const miniByTeam = new Map(mini.map((r) => [r.teamId, r]));
  const sorted = [...set].sort((a, b) =>
    compareTable(miniByTeam.get(a)!, miniByTeam.get(b)!),
  );
  const clusters = partition(sorted, (t) => {
    const r = miniByTeam.get(t)!;
    return `${r.points}|${r.goalDifference}|${r.goalsFor}`;
  });

  // Head-to-head separated the set: recurse into each smaller sub-group.
  if (clusters.length > 1) {
    const out: string[] = [];
    for (const cluster of clusters) {
      out.push(
        ...breakTie(cluster, matches, overall, teams, includeLive, unresolved),
      );
    }
    return out;
  }

  // Head-to-head could not separate the set: use overall criteria d)–h).
  return rankByOverall(set, overall, teams, unresolved);
}

/**
 * Rank the teams of a single group per Article 13. Primary order is points;
 * teams level on points are separated by the head-to-head-first procedure.
 */
export function rankGroup(
  teamIds: readonly string[],
  matches: readonly Match[],
  options: RankOptions = {},
): RankedRow[] {
  const includeLive = options.includeLive ?? true;
  const teams = new Map((options.teams ?? []).map((t) => [t.id, t]));
  const overallRows = computeStandings(teamIds, matches, { includeLive });
  const overall = new Map(overallRows.map((r) => [r.teamId, r]));
  const unresolved = new Set<string>();

  const byPoints = [...teamIds].sort(
    (a, b) => overall.get(b)!.points - overall.get(a)!.points,
  );
  const pointClusters = partition(byPoints, (t) =>
    String(overall.get(t)!.points),
  );

  const orderedIds: string[] = [];
  for (const cluster of pointClusters) {
    if (cluster.length === 1) {
      orderedIds.push(cluster[0]!);
    } else {
      orderedIds.push(
        ...breakTie(cluster, matches, overall, teams, includeLive, unresolved),
      );
    }
  }

  return orderedIds.map((teamId, index) => {
    const row = overall.get(teamId)!;
    const ranked: RankedRow = { ...row, position: index + 1 };
    if (unresolved.has(teamId)) ranked.unresolvedTie = true;
    return ranked;
  });
}

/**
 * Build a full GroupRanking, including whether the group's positions are final
 * (every match in the group has finished).
 */
export function buildGroupRanking(
  group: GroupId,
  teamIds: readonly string[],
  groupMatches: readonly Match[],
  options: RankOptions = {},
): GroupRanking {
  const rows = rankGroup(teamIds, groupMatches, options);
  const complete =
    groupMatches.length > 0 &&
    groupMatches.every((m) => m.status === "finished");
  return { group, rows, complete };
}
