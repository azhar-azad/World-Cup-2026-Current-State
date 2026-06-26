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

/**
 * Returns which teams have clinched their specific group position (1st or 2nd),
 * not just advancement. Used to determine when bracket slot assignments are final.
 *
 * A team clinches 1st when no other team can possibly equal their points total.
 * A team clinches 2nd when they've clinched advancement AND 1st place is locked
 * (so they can't swap upward with the current leader).
 */
export function computeClinchedPositions(groups: GroupRanking[]): {
  clinchedFirst: Set<string>;
  clinchedSecond: Set<string>;
} {
  const clinchedFirst = new Set<string>();
  const clinchedSecond = new Set<string>();

  for (const g of groups) {
    if (g.complete) {
      for (const r of g.rows) {
        if (r.position === 1) clinchedFirst.add(r.teamId);
        if (r.position === 2) clinchedSecond.add(r.teamId);
      }
      continue;
    }

    const team1 = g.rows.find((r) => r.position === 1);
    const team2 = g.rows.find((r) => r.position === 2);
    const team3 = g.rows.find((r) => r.position === 3);
    if (!team1) continue;

    // Team1 clinches 1st when no other team can reach their points total.
    const maxOthersCanReach = g.rows
      .filter((r) => r.position !== 1)
      .reduce((max, r) => Math.max(max, r.points + 3 * (3 - r.played)), 0);

    if (team1.points > maxOthersCanReach) {
      clinchedFirst.add(team1.teamId);
    }

    if (!team2 || !team3) continue;

    // Team2 clinches 2nd when they can't be overtaken from below AND team1's
    // position is locked (so team2 can't swap positions upward with team1).
    const thirdMax = team3.points + 3 * (3 - team3.played);
    if (team2.points > thirdMax && clinchedFirst.has(team1.teamId)) {
      clinchedSecond.add(team2.teamId);
    }
  }

  return { clinchedFirst, clinchedSecond };
}
