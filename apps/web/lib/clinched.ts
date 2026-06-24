import type { GroupRanking } from "@wc26/core";

/**
 * Returns the set of team IDs that have mathematically clinched a top-2 finish
 * in their group. A team at position 1 or 2 is clinched when the 3rd-place
 * team's maximum possible points (current + 3 × remaining games) is strictly
 * less than the team's current points — meaning 3rd and 4th can never overtake
 * them, so at most 1 team (current leader) finishes above them.
 */
export function computeClinched(groups: GroupRanking[]): Set<string> {
  const clinched = new Set<string>();
  for (const g of groups) {
    if (g.complete) {
      for (const r of g.rows) {
        if (r.position <= 2) clinched.add(r.teamId);
      }
      continue;
    }
    const third = g.rows.find((r) => r.position === 3);
    if (!third) continue;
    const thirdMax = third.points + 3 * (3 - third.played);
    for (const r of g.rows) {
      if (r.position <= 2 && r.points > thirdMax) clinched.add(r.teamId);
    }
  }
  return clinched;
}
