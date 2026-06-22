import { describe, expect, it } from "vitest";
import {
  allocateThirdPlaces,
  qualifyingThirdGroups,
  rankThirdPlaced,
  type ThirdPlaceEntry,
  type ThirdPlaceSlot,
} from "./thirdPlace";
import type { GroupId, StandingRow } from "./types";

// The eight real WC2026 third-place R32 slots and their candidate group sets.
const SLOTS: ThirdPlaceSlot[] = [
  { key: "ABCDF", candidates: [..."ABCDF"] as GroupId[] },
  { key: "CDFGH", candidates: [..."CDFGH"] as GroupId[] },
  { key: "CEFHI", candidates: [..."CEFHI"] as GroupId[] },
  { key: "EHIJK", candidates: [..."EHIJK"] as GroupId[] },
  { key: "BEFIJ", candidates: [..."BEFIJ"] as GroupId[] },
  { key: "AEHIJ", candidates: [..."AEHIJ"] as GroupId[] },
  { key: "EFGIJ", candidates: [..."EFGIJ"] as GroupId[] },
  { key: "DEIJL", candidates: [..."DEIJL"] as GroupId[] },
];

function row(teamId: string, points: number, gd: number, gf: number): StandingRow {
  return {
    teamId,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
    points,
  };
}

describe("rankThirdPlaced", () => {
  it("ranks by points, then GD, then goals; top 8 qualify", () => {
    const groups: GroupId[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    // Descending quality by points; a couple tied on points split by GD/GF.
    const entries: ThirdPlaceEntry[] = [
      { group: "A", row: row("a", 6, 4, 6) },
      { group: "B", row: row("b", 6, 4, 5) }, // tied with A on pts+GD, fewer goals
      { group: "C", row: row("c", 5, 2, 4) },
      { group: "D", row: row("d", 4, 3, 5) },
      { group: "E", row: row("e", 4, 1, 3) },
      { group: "F", row: row("f", 4, 1, 2) },
      { group: "G", row: row("g", 4, 0, 2) },
      { group: "H", row: row("h", 3, 0, 3) },
      { group: "I", row: row("i", 3, -1, 2) }, // 9th — eliminated
      { group: "J", row: row("j", 2, -2, 1) },
      { group: "K", row: row("k", 1, -4, 1) },
      { group: "L", row: row("l", 0, -6, 0) },
    ];
    const ranked = rankThirdPlaced(entries);
    expect(ranked.slice(0, 3).map((r) => r.teamId)).toEqual(["a", "b", "c"]);
    expect(ranked[0]!.position).toBe(1);

    const qualified = qualifyingThirdGroups(ranked);
    expect(qualified).toHaveLength(8);
    expect(qualified).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(qualified).not.toContain("I");
  });
});

describe("allocateThirdPlaces", () => {
  it("produces a valid perfect matching respecting candidate sets", () => {
    const qualifying = [..."ABCDEFGH"] as GroupId[];
    const map = allocateThirdPlaces(SLOTS, qualifying)!;
    expect(map).toBeDefined();
    expect(new Set(map.values()).size).toBe(8); // every group assigned once
    for (const [key, group] of map) {
      const slot = SLOTS.find((s) => s.key === key)!;
      expect(slot.candidates).toContain(group); // assignment respects the slot
      expect(qualifying).toContain(group);
    }
  });

  it("forces K -> EHIJK and L -> DEIJL (their only candidate slots)", () => {
    const qualifying = [..."CDEFIJKL"] as GroupId[];
    const map = allocateThirdPlaces(SLOTS, qualifying)!;
    expect(map.get("EHIJK")).toBe("K");
    expect(map.get("DEIJL")).toBe("L");
  });
});
