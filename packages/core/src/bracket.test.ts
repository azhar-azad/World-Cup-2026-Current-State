import { describe, expect, it } from "vitest";
import {
  resolveBracket,
  thirdPlaceSlotKey,
  type BracketMatchTemplate,
} from "./bracket";
import { km } from "./testUtils";
import type { GroupId, GroupRanking } from "./types";

function ranking(
  group: GroupId,
  ids: string[],
  complete: boolean,
): GroupRanking {
  return {
    group,
    complete,
    rows: ids.map((teamId, i) => ({
      teamId,
      position: i + 1,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })),
  };
}

const template: BracketMatchTemplate[] = [
  {
    matchNo: 73,
    stage: "R32",
    home: { kind: "groupWinner", group: "A" },
    away: { kind: "groupRunnerUp", group: "B" },
  },
  {
    matchNo: 74,
    stage: "R32",
    home: { kind: "groupWinner", group: "B" },
    away: { kind: "groupRunnerUp", group: "A" },
  },
  {
    matchNo: 89,
    stage: "R16",
    home: { kind: "matchWinner", matchNo: 73 },
    away: { kind: "matchWinner", matchNo: 74 },
  },
];

describe("resolveBracket", () => {
  it("fills group slots from completed groups and feeds winners forward", () => {
    const rankings = new Map<GroupId, GroupRanking>([
      ["A", ranking("A", ["A1", "A2", "A3", "A4"], true)],
      ["B", ranking("B", ["B1", "B2", "B3", "B4"], true)],
    ]);
    const matches = [km(73, "R32", 2, 1, "finished")]; // A1 beats B2; 74 not played
    const out = resolveBracket({ template, rankings, matches });
    const m73 = out.find((m) => m.matchNo === 73)!;
    const m74 = out.find((m) => m.matchNo === 74)!;
    const m89 = out.find((m) => m.matchNo === 89)!;

    expect(m73.home.teamId).toBe("A1");
    expect(m73.away.teamId).toBe("B2");
    expect(m73.winner).toBe("A1");

    expect(m74.home.teamId).toBe("B1");
    expect(m74.away.teamId).toBe("A2");
    expect(m74.status).toBe("scheduled");
    expect(m74.winner).toBeNull();

    expect(m89.home.teamId).toBe("A1"); // W73 resolved
    expect(m89.away.teamId).toBeNull(); // W74 pending
    expect(m89.away.label).toBe("W74");
  });

  it("leaves group slots pending until the group is complete", () => {
    const rankings = new Map<GroupId, GroupRanking>([
      ["A", ranking("A", ["A1", "A2", "A3", "A4"], false)],
      ["B", ranking("B", ["B1", "B2", "B3", "B4"], true)],
    ]);
    const out = resolveBracket({ template, rankings, matches: [] });
    const m73 = out.find((m) => m.matchNo === 73)!;
    expect(m73.home.teamId).toBeNull();
    expect(m73.home.label).toBe("1A");
  });

  it("resolves a knockout draw to a winner only via explicit winnerTeam", () => {
    const rankings = new Map<GroupId, GroupRanking>([
      ["A", ranking("A", ["A1", "A2", "A3", "A4"], true)],
      ["B", ranking("B", ["B1", "B2", "B3", "B4"], true)],
    ]);
    const drawNoWinner = resolveBracket({
      template,
      rankings,
      matches: [km(73, "R32", 1, 1, "finished")],
    });
    expect(drawNoWinner.find((m) => m.matchNo === 73)!.winner).toBeNull();

    const drawWithPens = resolveBracket({
      template,
      rankings,
      matches: [km(73, "R32", 1, 1, "finished", "B2")], // B2 wins on penalties
    });
    expect(drawWithPens.find((m) => m.matchNo === 73)!.winner).toBe("B2");
  });

  it("keeps third-place slots pending without an Annexe C allocation", () => {
    const tpl: BracketMatchTemplate[] = [
      {
        matchNo: 75,
        stage: "R32",
        home: { kind: "groupWinner", group: "A" },
        away: { kind: "thirdPlace", groups: ["A", "B", "C", "D", "F"] },
      },
    ];
    const rankings = new Map<GroupId, GroupRanking>([
      ["A", ranking("A", ["A1", "A2", "A3", "A4"], true)],
    ]);
    const out = resolveBracket({ template: tpl, rankings, matches: [] });
    const slot = out[0]!.away;
    expect(slot.teamId).toBeNull();
    expect(slot.label).toBe("3rd A/B/C/D/F");

    // With an allocation mapping the slot to group C, C's 3rd team fills it.
    const withAlloc = resolveBracket({
      template: tpl,
      rankings: new Map([
        ["A", ranking("A", ["A1", "A2", "A3", "A4"], true)],
        ["C", ranking("C", ["C1", "C2", "C3", "C4"], true)],
      ]),
      matches: [],
      thirdPlaceAllocation: new Map([
        [thirdPlaceSlotKey(["A", "B", "C", "D", "F"]), "C"],
      ]),
    });
    expect(withAlloc[0]!.away.teamId).toBe("C3");
  });

  it("provisional mode fills group slots from incomplete groups and flags them", () => {
    const rankings = new Map<GroupId, GroupRanking>([
      ["A", ranking("A", ["A1", "A2", "A3", "A4"], false)],
      ["B", ranking("B", ["B1", "B2", "B3", "B4"], false)],
    ]);
    const out = resolveBracket({
      template,
      rankings,
      matches: [],
      provisional: true,
    });
    const m73 = out.find((m) => m.matchNo === 73)!;
    expect(m73.home.teamId).toBe("A1"); // current group-A leader
    expect(m73.home.provisional).toBe(true);
    expect(m73.away.teamId).toBe("B2"); // current group-B runner-up
    expect(m73.away.provisional).toBe(true);
  });

  it("provisional mode fills a third-place slot even with incomplete groups", () => {
    const tpl: BracketMatchTemplate[] = [
      {
        matchNo: 75,
        stage: "R32",
        home: { kind: "groupWinner", group: "A" },
        away: { kind: "thirdPlace", groups: ["A", "B", "C", "D", "F"] },
      },
    ];
    const out = resolveBracket({
      template: tpl,
      rankings: new Map<GroupId, GroupRanking>([
        ["A", ranking("A", ["A1", "A2", "A3", "A4"], false)],
        ["C", ranking("C", ["C1", "C2", "C3", "C4"], false)],
      ]),
      matches: [],
      provisional: true,
      thirdPlaceAllocation: new Map([
        [thirdPlaceSlotKey(["A", "B", "C", "D", "F"]), "C"],
      ]),
    });
    expect(out[0]!.away.teamId).toBe("C3");
    expect(out[0]!.away.provisional).toBe(true);
  });
});
