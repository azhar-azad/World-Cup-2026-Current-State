import type { GroupId } from "@wc26/core";

/**
 * Annexe C of the FIFA World Cup 2026 regulations: for each of the 495 possible
 * combinations of the eight qualifying third-placed groups, which group's
 * third-placed team fills each Round-of-32 third-place slot.
 *
 * TODO (final milestone): populate the lookup table and return the slot-key ->
 * group mapping for the given qualifying groups. Until then this returns
 * undefined, so third-place bracket slots correctly stay "pending" — which is
 * the right behaviour anyway until all 72 group matches are played (~June 27).
 */
export function thirdPlaceAllocation(
  _qualifyingGroups: GroupId[],
): Map<string, GroupId> | undefined {
  return undefined;
}
