import { getAppData } from "@/lib/appData";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Knockout match numbers M73–M104
const KNOCKOUT_MATCH_NOS = Array.from({ length: 32 }, (_, i) => 73 + i);

export async function POST() {
  const { matches } = await store.getState();

  for (const m of matches) {
    if (!KNOCKOUT_MATCH_NOS.includes(m.matchNo)) continue;
    if (m.status === "scheduled" && m.homeScore === 0 && m.awayScore === 0 && !m.winnerTeam) continue;

    await store.update(m.matchNo, {
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
      winnerTeam: null,
    });
  }

  return Response.json(await getAppData());
}
