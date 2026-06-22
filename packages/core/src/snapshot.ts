import { resolveBracket, thirdPlaceSlotKey, type BracketMatchTemplate } from "./bracket";
import { buildGroupRanking } from "./ranking";
import {
  allocateThirdPlaces,
  qualifyingThirdGroups,
  rankThirdPlaced,
  type RankedThird,
  type ThirdPlaceSlot,
} from "./thirdPlace";
import { GROUP_IDS } from "./types";
import type {
  BracketMatch,
  GroupId,
  GroupRanking,
  Match,
  Team,
} from "./types";

export interface SnapshotInput {
  /** Group id -> the team ids in that group. */
  groupTeams: Record<GroupId, string[]>;
  /** The M73–M104 knockout template. */
  bracketTemplate: readonly BracketMatchTemplate[];
  /** Every match (group + knockout) with its current state. */
  matches: readonly Match[];
  teams?: readonly Team[];
  /**
   * Annexe C lookup: given the eight qualifying third-place groups, returns the
   * slot-key -> group allocation. Optional; only consulted (and treated as
   * official) once all groups are complete.
   */
  thirdPlaceAllocation?: (
    qualifyingGroups: GroupId[],
  ) => Map<string, GroupId> | undefined;
  /**
   * Fill bracket slots from the *current* standings (provisional) rather than
   * waiting for groups to finish. Third-place slots use a computed matching when
   * no official Annexe C allocation is available. Defaults to false.
   */
  provisional?: boolean;
  /** Count live matches at current score (provisional). Defaults to true. */
  includeLive?: boolean;
}

export interface Snapshot {
  groups: GroupRanking[];
  /** All twelve third-placed teams, ranked (the top 8 advance). */
  thirdPlace: RankedThird[];
  bracket: BracketMatch[];
}

/**
 * Compose the full app view from the current set of matches: rank every group
 * (Article 13), rank the third-placed teams, and resolve the bracket.
 */
export function buildSnapshot(input: SnapshotInput): Snapshot {
  const includeLive = input.includeLive ?? true;
  const provisional = input.provisional ?? false;
  const teams = input.teams;

  const rankings = new Map<GroupId, GroupRanking>();
  for (const group of GROUP_IDS) {
    const teamIds = input.groupTeams[group] ?? [];
    if (teamIds.length === 0) continue;
    const groupMatches = input.matches.filter(
      (m) => m.stage === "group" && m.group === group,
    );
    rankings.set(
      group,
      buildGroupRanking(group, teamIds, groupMatches, { teams, includeLive }),
    );
  }
  const groups = [...rankings.values()];

  const thirdEntries = groups
    .filter((g) => g.rows.length >= 3)
    .map((g) => ({ group: g.group, row: g.rows[2]! }));
  const thirdPlace = rankThirdPlaced(thirdEntries, { teams });
  const qualifying = qualifyingThirdGroups(thirdPlace);

  const allComplete = groups.length === 12 && groups.every((g) => g.complete);

  // Distinct third-place slots declared by the template (their candidate sets).
  const thirdSlots: ThirdPlaceSlot[] = [];
  const seen = new Set<string>();
  for (const t of input.bracketTemplate) {
    for (const source of [t.home, t.away]) {
      if (source.kind === "thirdPlace") {
        const key = thirdPlaceSlotKey(source.groups);
        if (!seen.has(key)) {
          seen.add(key);
          thirdSlots.push({ key, candidates: source.groups });
        }
      }
    }
  }

  // Prefer the official Annexe C allocation once groups are complete; otherwise,
  // in provisional mode, compute a valid (non-official) matching for display.
  let allocation: Map<string, GroupId> | undefined;
  const official =
    allComplete && input.thirdPlaceAllocation
      ? input.thirdPlaceAllocation(qualifying)
      : undefined;
  if (official) {
    allocation = official;
  } else if (provisional && thirdSlots.length > 0) {
    allocation = allocateThirdPlaces(thirdSlots, qualifying);
  }

  const bracket = resolveBracket({
    template: input.bracketTemplate,
    rankings,
    matches: input.matches,
    thirdPlaceAllocation: allocation,
    provisional,
    includeLive,
  });

  return { groups, thirdPlace, bracket };
}
