# FIFA World Cup 2026 — Live Visualizer

A single-page dashboard for the 2026 World Cup: live group standings, a
fixtures strip (upcoming / past), and the full knockout bracket — all
recomputed instantly as match events are entered.

Standings follow the **official Article 13 ranking rules** (head-to-head first,
which differs from the 2022 overall-GD-first method) and the bracket follows the
**M73–M104 structure from Articles 12.5–12.11** of the regulations.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **`packages/core`** — framework-free rules engine (standings, Article 13
  ranking, third-place ranking, bracket resolution, snapshot composer). Fully
  unit-tested with Vitest.
- **`packages/data`** — static seed: 48 teams, 12 groups, the 104-match schedule
  (with real results to date, sourced from
  [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)),
  the knockout template, and flag helpers.
- **`apps/web`** — Next.js (App Router) + Tailwind CSS. Full-stack: the route
  handlers are the backend. Live updates over **Server-Sent Events**.

### Notable decisions

- **Manual input only.** No external live API (none is reliably free). Results
  are entered through the `/admin` panel; everything is derived from them. The
  data source sits behind one route handler, so a provider adapter could be
  added later without touching `core` or the UI.
- **JSON-file store** (`apps/web/data/state.json`) instead of SQLite — zero
  native build tooling, fine for a single-user, ~104-record app, and swappable
  behind the small `MatchStore` interface in `apps/web/lib/store.ts`.
- **Live tables are provisional:** an in-progress match counts at its current
  scoreline (`computeStandings(..., { includeLive: true })`).

## Run it

```bash
pnpm install
pnpm dev            # Next.js dev server on http://localhost:3000
```

- `/` — the dashboard (groups, matches, bracket). A green "Live" dot means the
  SSE stream is connected.
- `/admin` — set each match's status (scheduled → live → finished), add/remove
  goals per side (with optional minute), and set a penalty winner for drawn
  knockout matches. "Reset" re-seeds from the static schedule.

Open both in two windows: editing in `/admin` updates the dashboard live.

```bash
pnpm test           # run the engine + seed test suites
pnpm typecheck      # type-check every package
pnpm build          # production build of the web app
```

## How it fits together

1. The admin panel `PATCH`es `/api/matches/:matchNo`; the store persists and
   notifies subscribers.
2. `/api/stream` (SSE) pushes a fresh `AppData` snapshot to every connected
   client on each change.
3. A snapshot = `buildSnapshot()` over the current matches: rank all 12 groups
   (Article 13), rank the third-placed teams, and resolve the bracket. Group
   slots fill once a group is complete; winner-fed slots fill as feeder matches
   finish; undetermined slots stay labelled (e.g. `1A`, `W73`, `3rd A/B/C/D/F`).

## Known gaps

- **Fair-play tiebreaker (Article 13 f):** not computed because cards aren't
  captured (scope is goals + status). When teams are dead level through goals
  scored, the engine flags the tie (`*` in the UI) and falls back to FIFA
  ranking; a manual override can settle it.
- **Annexe C third-place allocation:** the bracket is built in *provisional*
  mode (`buildSnapshot({ provisional: true })`), so group winners/runners-up
  and the eight third-placed teams drop into their R32 boxes from the current
  standings, flagged provisional (italic + amber dot) until clinched. The
  *specific* third-place slot assignment is a computed valid matching
  (`allocateThirdPlaces`), **not** FIFA's official choice: every combination has
  several valid matchings and FIFA pre-picks one in a 495-row table (Annexe C),
  which is a pure lookup not derivable from the rules. The official table is not
  yet populated (`apps/web/lib/annexeC.ts`); once it is, those slots become
  authoritative. Strict mode (`provisional: false`) leaves everything pending
  until groups finish.
