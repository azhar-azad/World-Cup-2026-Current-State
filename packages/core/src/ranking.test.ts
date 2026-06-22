import { describe, expect, it } from "vitest";
import { rankGroup } from "./ranking";
import { gm } from "./testUtils";
import type { Match } from "./types";

const order = (rows: { teamId: string }[]) => rows.map((r) => r.teamId);

describe("rankGroup — Article 13", () => {
  it("ranks by points when there is no tie", () => {
    const m = [
      gm("A", "MEX", "KOR", 2, 0),
      gm("A", "CZE", "RSA", 0, 0),
      gm("A", "MEX", "CZE", 1, 0),
      gm("A", "KOR", "RSA", 1, 0),
      gm("A", "MEX", "RSA", 3, 0),
      gm("A", "KOR", "CZE", 1, 0),
    ];
    const rows = rankGroup(["MEX", "KOR", "CZE", "RSA"], m);
    expect(order(rows)).toEqual(["MEX", "KOR", "CZE", "RSA"]);
    expect(rows[0]!.position).toBe(1);
  });

  it("uses head-to-head BEFORE overall goal difference (the WC2026 rule)", () => {
    // A and B both finish on 6 pts. B has the better OVERALL goal difference
    // (+5 vs +1), but A beat B head-to-head, so A must rank above B.
    const m: Match[] = [
      gm("C", "A", "B", 1, 0), // A beats B head-to-head
      gm("C", "A", "C", 1, 0),
      gm("C", "D", "A", 1, 0), // A loses to D
      gm("C", "B", "C", 5, 0), // B thrashes C -> big overall GD
      gm("C", "B", "D", 1, 0),
      gm("C", "D", "C", 0, 0),
    ];
    const rows = rankGroup(["A", "B", "C", "D"], m);
    const a = rows.find((r) => r.teamId === "A")!;
    const b = rows.find((r) => r.teamId === "B")!;
    expect(a.points).toBe(6);
    expect(b.points).toBe(6);
    expect(b.goalDifference).toBeGreaterThan(a.goalDifference); // B better overall
    expect(a.position).toBeLessThan(b.position); // ...yet A ranks higher (h2h)
    expect(order(rows)).toEqual(["A", "B", "D", "C"]);
  });

  it("falls back to overall GD when head-to-head is a perfect cycle", () => {
    // P, Q, R form a 1-0 cycle (identical head-to-head: 3 pts, GD 0, GF 1 each),
    // so the tie can only be broken by overall goal difference, where each beat
    // S by a different margin: Q (+3) > R (+2) > P (+1).
    const m: Match[] = [
      gm("D", "P", "Q", 1, 0),
      gm("D", "Q", "R", 1, 0),
      gm("D", "R", "P", 1, 0),
      gm("D", "P", "S", 1, 0),
      gm("D", "Q", "S", 3, 0),
      gm("D", "R", "S", 2, 0),
    ];
    const rows = rankGroup(["P", "Q", "R", "S"], m);
    expect(order(rows)).toEqual(["Q", "R", "P", "S"]);
  });

  it("flags a tie that only FIFA ranking / lots can break", () => {
    // X and Y draw head-to-head and have identical overall GD and goals.
    // Separated only by FIFA ranking -> both flagged unresolved.
    const m: Match[] = [
      gm("E", "X", "Y", 1, 1),
      gm("E", "X", "Z", 2, 0),
      gm("E", "Y", "Z", 2, 0),
    ];
    const rows = rankGroup(["X", "Y", "Z"], m, {
      teams: [
        { id: "X", name: "X", iso2: "xx", fifaRanking: 5 },
        { id: "Y", name: "Y", iso2: "yy", fifaRanking: 9 },
        { id: "Z", name: "Z", iso2: "zz" },
      ],
    });
    expect(order(rows)).toEqual(["X", "Y", "Z"]); // X ahead via FIFA ranking
    expect(rows.find((r) => r.teamId === "X")!.unresolvedTie).toBe(true);
    expect(rows.find((r) => r.teamId === "Y")!.unresolvedTie).toBe(true);
    expect(rows.find((r) => r.teamId === "Z")!.unresolvedTie).toBeUndefined();
  });

  it("supports provisional standings from a live match", () => {
    const m: Match[] = [
      gm("F", "USA", "CAN", 1, 0, "live"), // USA leading live
    ];
    const rows = rankGroup(["USA", "CAN"], m, { includeLive: true });
    expect(rows[0]!.teamId).toBe("USA");
    expect(rows[0]!.points).toBe(3);
  });
});
