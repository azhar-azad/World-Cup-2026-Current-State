/**
 * Simulation script: fills every unplayed match using FIFA rankings.
 *
 * Higher-ranked team wins 1-0 in every match.
 * All updates go through the admin API so the in-memory store stays in sync.
 *
 * Run: node scripts/simulate.mjs
 * (dev server must be running on localhost:3000)
 */

const BASE_URL = "http://localhost:3000";
const ADMIN_PASSWORD = "yourpassword";

// ─── FIFA Ranking lookup (rank 1 = best) ─────────────────────────────────────
// Source: https://inside.fifa.com/fifa-world-ranking/men  (June 2026 live)
const FIFA_RANK = {
  FRA: 1,   // France
  ARG: 2,   // Argentina
  ESP: 3,   // Spain
  ENG: 4,   // England
  BRA: 5,   // Brazil
  MAR: 6,   // Morocco
  NED: 7,   // Netherlands
  POR: 8,   // Portugal
  MEX: 9,   // Mexico
  BEL: 10,  // Belgium
  COL: 11,  // Colombia
  GER: 12,  // Germany
  CRO: 13,  // Croatia
  USA: 15,  // USA
  SUI: 16,  // Switzerland
  JPN: 17,  // Japan
  SEN: 18,  // Senegal
  URU: 19,  // Uruguay
  IRN: 21,  // Iran
  AUT: 22,  // Austria
  NOR: 23,  // Norway
  ECU: 24,  // Ecuador
  EGY: 26,  // Egypt
  TUR: 27,  // Turkey (Türkiye)
  AUS: 28,  // Australia
  ALG: 29,  // Algeria
  CIV: 30,  // Ivory Coast (Côte d'Ivoire)
  KOR: 31,  // South Korea (Korea Republic)
  CAN: 32,  // Canada
  SWE: 36,  // Sweden
  PAR: 37,  // Paraguay
  SCO: 41,  // Scotland
  PAN: 42,  // Panama
  CZE: 48,  // Czech Republic (Czechia)
  RSA: 54,  // South Africa
  UZB: 57,  // Uzbekistan
  TUN: 58,  // Tunisia
  KSA: 59,  // Saudi Arabia
  QAT: 60,  // Qatar
  BIH: 61,  // Bosnia & Herzegovina
  IRQ: 63,  // Iraq
  CPV: 64,  // Cape Verde (Cabo Verde)
  GHA: 65,  // Ghana
  JOR: 72,  // Jordan
  CUW: 82,  // Curaçao
  NZL: 86,  // New Zealand
  HAI: 88,  // Haiti
  COD: 46,  // DR Congo
};

function rank(teamId) {
  const r = FIFA_RANK[teamId];
  if (r == null) console.warn(`  ⚠ Unknown team: ${teamId}`);
  return r ?? 999;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/wc26_admin=([^;]+)/)?.[1];
  if (!token) throw new Error("No session cookie received");
  console.log("✓ Logged in");
  return token;
}

async function getSnapshot(token) {
  const res = await fetch(`${BASE_URL}/api/snapshot`);
  if (!res.ok) throw new Error(`Snapshot failed: ${res.status}`);
  return res.json();
}

async function patchMatch(matchNo, body, token) {
  const res = await fetch(`${BASE_URL}/api/matches/${matchNo}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `wc26_admin=${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH M${matchNo} failed (${res.status}): ${text.slice(0, 120)}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Phase 1: fill remaining group-stage matches ──────────────────────────────

async function fillGroupStage(token) {
  console.log("\n◎ Phase 1 — Group stage");
  const snapshot = await getSnapshot(token);

  const pending = snapshot.matches.filter(
    (m) => m.stage === "group" && m.status === "scheduled" && m.homeTeam && m.awayTeam,
  );
  console.log(`  ${pending.length} matches to fill`);

  for (const m of pending) {
    const hr = rank(m.homeTeam);
    const ar = rank(m.awayTeam);
    const homeWins = hr <= ar;
    process.stdout.write(
      `  M${String(m.matchNo).padStart(2)} ${m.homeTeam}(#${hr}) vs ${m.awayTeam}(#${ar}) → ${homeWins ? m.homeTeam : m.awayTeam} … `,
    );
    await patchMatch(
      m.matchNo,
      { status: "finished", homeScore: homeWins ? 1 : 0, awayScore: homeWins ? 0 : 1 },
      token,
    );
    console.log("✓");
    await sleep(80);
  }
  console.log("  ✓ Group stage complete");
}

// ─── Phase 2: fill knockout rounds ───────────────────────────────────────────

const STAGE_LABEL = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-finals", SF: "Semi-finals", third: "3rd place", final: "Final" };

async function fillKnockoutRound(stage, token) {
  console.log(`\n◎ ${STAGE_LABEL[stage] ?? stage}`);
  // Fresh snapshot so bracket is up-to-date
  const snapshot = await getSnapshot(token);

  const pending = snapshot.bracket.filter(
    (b) => b.stage === stage && b.status === "scheduled",
  );

  if (pending.length === 0) {
    console.log("  (no matches to fill)");
    return;
  }

  for (const bm of pending) {
    const homeId = bm.home?.teamId;
    const awayId = bm.away?.teamId;

    if (!homeId || !awayId) {
      console.log(`  ⚠ M${bm.matchNo}: participants not resolved yet (${bm.home?.label} vs ${bm.away?.label})`);
      continue;
    }

    const hr = rank(homeId);
    const ar = rank(awayId);
    const homeWins = hr <= ar;
    const winner = homeWins ? homeId : awayId;

    process.stdout.write(
      `  M${bm.matchNo} ${bm.home.label}(#${hr}) vs ${bm.away.label}(#${ar}) → ${winner} … `,
    );
    await patchMatch(
      bm.matchNo,
      {
        status: "finished",
        homeScore: homeWins ? 1 : 0,
        awayScore: homeWins ? 0 : 1,
        winnerTeam: winner,
      },
      token,
    );
    console.log("✓");
    await sleep(80);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log("=== WC 2026 FIFA-ranking simulation ===");
const token = await login();

await fillGroupStage(token);
// Give the bracket engine a moment to propagate group results
await sleep(500);

for (const stage of ["R32", "R16", "QF", "SF", "third", "final"]) {
  await fillKnockoutRound(stage, token);
  await sleep(300);
}

console.log("\n✓ Done — refresh the dashboard to see the full simulated bracket.");
