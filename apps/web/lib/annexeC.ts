import type { GroupId } from "@wc26/core";

/**
 * Annexe C of the FIFA World Cup 2026 regulations: for each of the 495 possible
 * combinations of the eight qualifying third-placed groups, which group's
 * third-placed team fills each Round-of-32 third-place slot.
 *
 * Only the actual combination that occurred (B, D, E, F, I, J, K, L) is
 * populated. The key is the sorted qualifying group ids joined, e.g. "BDEFIJKL".
 */
const ANNEXE_C: Record<string, Map<string, GroupId>> = {
  BDEFIJKL: new Map<string, GroupId>([
    ["ABCDF", "D"], // M74: 1E vs 3D (Paraguay)
    ["CDFGH", "F"], // M77: 1I vs 3F (Sweden)
    ["CEFHI", "E"], // M79: 1A vs 3E (Ecuador)
    ["EHIJK", "K"], // M80: 1L vs 3K (DR Congo)
    ["BEFIJ", "B"], // M81: 1D vs 3B (Bosnia & Herzegovina)
    ["AEHIJ", "I"], // M82: 1G vs 3I (Senegal)
    ["EFGIJ", "J"], // M85: 1B vs 3J (Algeria)
    ["DEIJL", "L"], // M87: 1K vs 3L (Ghana)
  ]),
};

export function thirdPlaceAllocation(
  qualifyingGroups: GroupId[],
): Map<string, GroupId> | undefined {
  const key = [...qualifyingGroups].sort().join("");
  return ANNEXE_C[key];
}
