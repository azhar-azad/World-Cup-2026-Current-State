import type { GroupId, StandingRow, Team } from "./types";

export interface ThirdPlaceEntry {
  group: GroupId;
  /** Overall group standing row of the team that finished 3rd in this group. */
  row: StandingRow;
}

export interface RankedThird {
  group: GroupId;
  teamId: string;
  /** 1-based rank across all third-placed teams. */
  position: number;
  played: number;
  points: number;
  goalsFor: number;
  goalDifference: number;
  /** True if separated from a rival only by FIFA ranking / lots. */
  unresolvedTie?: boolean;
}

export interface ThirdPlaceOptions {
  teams?: readonly Team[];
}

/**
 * Rank all twelve third-placed teams. The eight best advance to the Round of 32.
 * Criteria (FIFA WC 2026, same family as Article 13): points, overall goal
 * difference, overall goals scored, [fair play — skipped], FIFA ranking, lots.
 */
export function rankThirdPlaced(
  entries: readonly ThirdPlaceEntry[],
  options: ThirdPlaceOptions = {},
): RankedThird[] {
  const teams = new Map((options.teams ?? []).map((t) => [t.id, t]));
  const sorted = [...entries].sort((a, b) => {
    const ra = a.row;
    const rb = b.row;
    if (rb.points !== ra.points) return rb.points - ra.points;
    if (rb.goalDifference !== ra.goalDifference) {
      return rb.goalDifference - ra.goalDifference;
    }
    if (rb.goalsFor !== ra.goalsFor) return rb.goalsFor - ra.goalsFor;
    const fa = teams.get(a.row.teamId)?.fifaRanking ?? Number.MAX_SAFE_INTEGER;
    const fb = teams.get(b.row.teamId)?.fifaRanking ?? Number.MAX_SAFE_INTEGER;
    if (fa !== fb) return fa - fb;
    return a.group < b.group ? -1 : 1;
  });

  // Flag entries level through goals scored (separated only by FIFA/lots).
  const byKey = new Map<string, string[]>();
  for (const e of entries) {
    const key = `${e.row.points}|${e.row.goalDifference}|${e.row.goalsFor}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(e.row.teamId);
    else byKey.set(key, [e.row.teamId]);
  }
  const unresolved = new Set<string>();
  for (const bucket of byKey.values()) {
    if (bucket.length > 1) for (const id of bucket) unresolved.add(id);
  }

  return sorted.map((e, i) => {
    const ranked: RankedThird = {
      group: e.group,
      teamId: e.row.teamId,
      position: i + 1,
      played: e.row.played,
      points: e.row.points,
      goalsFor: e.row.goalsFor,
      goalDifference: e.row.goalDifference,
    };
    if (unresolved.has(e.row.teamId)) ranked.unresolvedTie = true;
    return ranked;
  });
}

/** The groups whose third-placed team qualifies (the top 8), sorted A→L. */
export function qualifyingThirdGroups(ranked: readonly RankedThird[]): GroupId[] {
  return ranked
    .slice(0, 8)
    .map((r) => r.group)
    .sort();
}

export interface ThirdPlaceSlot {
  /** Slot key (the sorted, concatenated candidate group set, e.g. "ABCDF"). */
  key: string;
  /** The groups whose third-placed team may fill this slot. */
  candidates: readonly GroupId[];
}

/**
 * Assign the eight qualifying third-placed groups to the eight third-place
 * Round-of-32 slots, respecting each slot's candidate set. Every set of 8 groups
 * admits at least one valid assignment, but usually several — the official
 * choice per combination lives in Annexe C (a 495-row lookup). This computes a
 * *deterministic* valid matching (most-constrained slot first, groups in
 * alphabetical order) for provisional display. It is NOT guaranteed to match
 * FIFA's official Annexe C assignment; callers should mark results provisional.
 */
export function allocateThirdPlaces(
  slots: readonly ThirdPlaceSlot[],
  qualifyingGroups: readonly GroupId[],
): Map<string, GroupId> | undefined {
  const qualifying = new Set(qualifyingGroups);
  const result = new Map<string, GroupId>();
  const usedGroups = new Set<GroupId>();

  const assign = (): boolean => {
    if (result.size === slots.length) return true;
    // Minimum-remaining-values heuristic: fill the most constrained slot first.
    let best: ThirdPlaceSlot | undefined;
    let bestOptions: GroupId[] | undefined;
    for (const slot of slots) {
      if (result.has(slot.key)) continue;
      const options = slot.candidates
        .filter((g) => qualifying.has(g) && !usedGroups.has(g))
        .sort();
      if (!bestOptions || options.length < bestOptions.length) {
        best = slot;
        bestOptions = options;
      }
    }
    if (!best || !bestOptions || bestOptions.length === 0) return false;
    for (const group of bestOptions) {
      result.set(best.key, group);
      usedGroups.add(group);
      if (assign()) return true;
      result.delete(best.key);
      usedGroups.delete(group);
    }
    return false;
  };

  return assign() ? result : undefined;
}
