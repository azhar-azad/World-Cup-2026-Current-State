import { describe, expect, it } from "vitest";
import { computeStandings } from "./standings";
import { gm } from "./testUtils";

describe("computeStandings", () => {
  it("aggregates wins, draws, losses, goals and points", () => {
    const matches = [
      gm("A", "MEX", "KOR", 2, 0),
      gm("A", "CZE", "RSA", 1, 1),
      gm("A", "MEX", "CZE", 1, 0),
    ];
    const rows = computeStandings(["MEX", "KOR", "CZE", "RSA"], matches);
    const mex = rows.find((r) => r.teamId === "MEX")!;
    expect(mex).toMatchObject({
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 3,
      goalsAgainst: 0,
      goalDifference: 3,
      points: 6,
    });
    const cze = rows.find((r) => r.teamId === "CZE")!;
    expect(cze).toMatchObject({ played: 2, drawn: 1, lost: 1, points: 1 });
  });

  it("counts live matches at current score when includeLive is true", () => {
    const matches = [gm("B", "CAN", "SUI", 1, 0, "live")];
    const live = computeStandings(["CAN", "SUI"], matches, { includeLive: true });
    expect(live.find((r) => r.teamId === "CAN")!.points).toBe(3);

    const finishedOnly = computeStandings(["CAN", "SUI"], matches, {
      includeLive: false,
    });
    expect(finishedOnly.find((r) => r.teamId === "CAN")!.points).toBe(0);
    expect(finishedOnly.find((r) => r.teamId === "CAN")!.played).toBe(0);
  });

  it("ignores matches involving teams outside the given set (mini-table)", () => {
    const matches = [
      gm("A", "MEX", "KOR", 2, 0),
      gm("A", "MEX", "CZE", 0, 1),
    ];
    // Mini-table for just MEX & KOR should ignore the MEX–CZE match.
    const rows = computeStandings(["MEX", "KOR"], matches);
    expect(rows.find((r) => r.teamId === "MEX")!.played).toBe(1);
    expect(rows.find((r) => r.teamId === "MEX")!.points).toBe(3);
  });
});
