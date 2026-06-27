import { getAppData } from "@/lib/appData";
import { store } from "@/lib/store";
import type { Stage } from "@wc26/core";

export const dynamic = "force-dynamic";

const FIFA_RANK: Record<string, number> = {
  FRA: 1,  ARG: 2,  ESP: 3,  ENG: 4,  BRA: 5,
  MAR: 6,  NED: 7,  POR: 8,  MEX: 9,  BEL: 10,
  COL: 11, GER: 12, CRO: 13, USA: 15, SUI: 16,
  JPN: 17, SEN: 18, URU: 19, IRN: 21, AUT: 22,
  NOR: 23, ECU: 24, EGY: 26, TUR: 27, AUS: 28,
  ALG: 29, CIV: 30, KOR: 31, CAN: 32, SWE: 36,
  PAR: 37, SCO: 41, PAN: 42, CZE: 48, RSA: 54,
  UZB: 57, TUN: 58, KSA: 59, QAT: 60, BIH: 61,
  IRQ: 63, CPV: 64, GHA: 65, JOR: 72, CUW: 82,
  NZL: 86, HAI: 88, COD: 46,
};

function rank(teamId: string): number {
  return FIFA_RANK[teamId] ?? 999;
}

// Knockout rounds only — never touch group-stage matches so real results are preserved.
const STAGES: Stage[] = ["R32", "R16", "QF", "SF", "third", "final"];

export async function POST() {
  for (const stage of STAGES) {
    const data = await getAppData();
    const pending = data.bracket.filter(
      (b) => b.stage === stage && b.status === "scheduled",
    );

    for (const bm of pending) {
      const homeId = bm.home.teamId;
      const awayId = bm.away.teamId;
      if (!homeId || !awayId) continue;

      const homeWins = rank(homeId) <= rank(awayId);
      const winner = homeWins ? homeId : awayId;

      await store.update(bm.matchNo, {
        status: "finished",
        homeScore: homeWins ? 1 : 0,
        awayScore: homeWins ? 0 : 1,
        winnerTeam: winner,
      });
    }
  }

  return Response.json(await getAppData());
}
