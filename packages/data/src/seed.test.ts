import { buildSnapshot } from "@wc26/core";
import { describe, expect, it } from "vitest";
import { bracketTemplate } from "./bracketTemplate";
import { groupTeams } from "./groups";
import { schedule } from "./schedule";
import { teams } from "./teams";

describe("seed data + full snapshot pipeline", () => {
  const snap = buildSnapshot({
    groupTeams,
    bracketTemplate,
    matches: schedule,
    teams,
  });

  it("has 48 teams across 12 groups of 4 and a 104-match schedule", () => {
    expect(teams).toHaveLength(48);
    for (const ids of Object.values(groupTeams)) expect(ids).toHaveLength(4);
    expect(schedule).toHaveLength(104);
    expect(schedule.filter((m) => m.stage === "group")).toHaveLength(72);
  });

  it("ranks Group A exactly as the live standings show", () => {
    const a = snap.groups.find((g) => g.group === "A")!;
    expect(a.rows.map((r) => r.teamId)).toEqual(["MEX", "KOR", "CZE", "RSA"]);
    expect(a.rows[0]).toMatchObject({ points: 6, goalDifference: 3 });
    expect(a.complete).toBe(false); // only 4 of 6 group-A matches played
  });

  it("builds a 32-match bracket with correct labels, all pending pre-knockout", () => {
    expect(snap.bracket).toHaveLength(32);
    const m79 = snap.bracket.find((m) => m.matchNo === 79)!;
    expect(m79.home.label).toBe("1A"); // Group A winner slot
    expect(m79.home.teamId).toBeNull(); // group not complete -> pending

    const m74 = snap.bracket.find((m) => m.matchNo === 74)!;
    expect(m74.away.label).toBe("3rd A/B/C/D/F");
    expect(m74.away.teamId).toBeNull(); // no Annexe C allocation yet

    const m104 = snap.bracket.find((m) => m.matchNo === 104)!;
    expect(m104.stage).toBe("final");
    expect(m104.home.label).toBe("W101");
  });

  it("provisional mode fills R32 group + third-place slots from current standings", () => {
    const prov = buildSnapshot({
      groupTeams,
      bracketTemplate,
      matches: schedule,
      teams,
      provisional: true,
    });
    // 1A current leader (Mexico) drops into its R32 slot, flagged provisional.
    const m79 = prov.bracket.find((m) => m.matchNo === 79)!;
    expect(m79.home.teamId).toBe("MEX");
    expect(m79.home.provisional).toBe(true);
    // Third-place slots now resolve to a (provisional) team via the matching.
    const m74 = prov.bracket.find((m) => m.matchNo === 74)!;
    expect(m74.away.teamId).not.toBeNull();
    expect(m74.away.provisional).toBe(true);
    // All 12 third-placed teams ranked; the top 8 are the qualifiers.
    expect(prov.thirdPlace).toHaveLength(12);
    expect(prov.thirdPlace[0]!.position).toBe(1);
  });
});
