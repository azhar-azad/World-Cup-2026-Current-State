export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { id: number; tla: string; name: string; shortName: string };
  awayTeam: { id: number; tla: string; name: string; shortName: string };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
  };
}

// football-data.org TLA → our internal team id.
// Includes alternate TLAs they've historically used (e.g. IRI for Iran).
const FD_TLA_TO_ID: Record<string, string> = {
  MEX: "MEX", RSA: "RSA", KOR: "KOR", CZE: "CZE",
  CAN: "CAN", BIH: "BIH", QAT: "QAT", SUI: "SUI",
  BRA: "BRA", MAR: "MAR", HAI: "HAI", SCO: "SCO",
  USA: "USA", PAR: "PAR", AUS: "AUS", TUR: "TUR",
  GER: "GER", CUW: "CUW", CIV: "CIV", ECU: "ECU",
  NED: "NED", JPN: "JPN", SWE: "SWE", TUN: "TUN",
  BEL: "BEL", EGY: "EGY", IRI: "IRN", IRN: "IRN", NZL: "NZL",
  ESP: "ESP", CPV: "CPV", KSA: "KSA", URU: "URU",
  FRA: "FRA", SEN: "SEN", IRQ: "IRQ", NOR: "NOR",
  ARG: "ARG", ALG: "ALG", AUT: "AUT", JOR: "JOR",
  POR: "POR", COD: "COD", UZB: "UZB", COL: "COL",
  ENG: "ENG", CRO: "CRO", GHA: "GHA", PAN: "PAN",
};

export function fdTlaToId(tla: string): string | undefined {
  return FD_TLA_TO_ID[tla.toUpperCase()];
}

export function fdStatusToInternal(
  status: string,
): "scheduled" | "live" | "finished" | null {
  switch (status) {
    case "TIMED":
    case "SCHEDULED":
      return "scheduled";
    case "IN_PLAY":
    case "PAUSED":
    case "HALFTIME":
      return "live";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    default:
      return null; // POSTPONED, CANCELLED, etc. — ignore
  }
}

// Competition code football-data.org uses for the active World Cup.
// Override with FOOTBALL_DATA_COMPETITION_CODE if they change it.
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC";

export async function fetchWC2026Matches(): Promise<FDMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set");

  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`,
    {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(
      `football-data.org error: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as { matches: FDMatch[] };
  return data.matches;
}
