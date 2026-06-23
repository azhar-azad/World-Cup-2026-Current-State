# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Live FIFA World Cup 2026 visualizer: group standings, fixtures, and the knockout
bracket, all recomputed from manually-entered match results. There is no external
live API — results are entered in `/admin` and everything else is *derived* by a
pure rules engine. The dashboard refreshes live over Server-Sent Events.

## Commands

Package manager is **pnpm** (locked to `pnpm@9.15.9`); Node `>=20`. Run from the repo root.

```bash
pnpm install
pnpm dev          # turbo -> next dev on http://localhost:3000 (/ dashboard, /admin editor)
pnpm test         # turbo -> vitest run across packages/core and packages/data
pnpm typecheck    # tsc --noEmit in every package
pnpm build        # production build of apps/web
```

`pnpm lint` is wired in turbo but **no package defines a lint script**, so it is a
no-op today — use `pnpm typecheck` as the real static check.

Per-package / single test (the engine tests live in `packages/core`):

```bash
pnpm --filter @wc26/core test                       # one package's suite
pnpm --filter @wc26/core test:watch                 # watch mode (core only)
pnpm --filter @wc26/core exec vitest run ranking     # single file by name substring
pnpm --filter @wc26/core exec vitest run -t "head-to-head"   # single test by title
```

## Architecture

Monorepo (pnpm workspaces + Turborepo). Strict dependency direction:
**`core` (no deps) ← `data` ← `apps/web`**. Keep `core` framework-free.

- **`packages/core`** — the rules engine, pure TypeScript, fully Vitest-tested.
  The entry point is `buildSnapshot()` (`snapshot.ts`), which composes one
  `Snapshot { groups, thirdPlace, bracket }` from the current match list:
  - `standings.ts` aggregates matches into table rows.
  - `ranking.ts` implements **FIFA Article 13** — teams level on points are split
    **head-to-head first** (a mini-table of only the matches *between* the tied
    teams, recursing into sub-groups), falling through to overall GD → goals →
    FIFA ranking → drawing-of-lots only when head-to-head can't separate them.
    Ties separable only by non-pitch criteria are flagged `unresolvedTie`.
  - `thirdPlace.ts` ranks the 12 third-placed teams (top 8 advance) and assigns
    them to bracket slots via backtracking (`allocateThirdPlaces`).
  - `bracket.ts` resolves the M73–M104 template; unresolved slots keep labels
    like `1A`, `2B`, `W73`, `3rd A/B/C/D/F`. Ascending `matchNo` is topological
    order, so a single forward pass resolves winner-fed slots.

- **`packages/data`** — static seed only: 48 teams, 12 groups, the 104-match
  `schedule` (with real results to date), the bracket template, flag helpers.

- **`apps/web`** — Next.js (App Router) + Tailwind v4. The route handlers *are*
  the backend; there is no separate server.
  - `lib/store.ts` — singleton `MatchStore` over a **JSON file**
    (`apps/web/data/state.json`), seeded from `@wc26/data` schedule on first run.
    All mutation goes through `update()`, which persists and `notify()`s
    subscribers. The instance is cached on `globalThis` to survive dev HMR.
  - `lib/appData.ts` — `getAppData()` is the single composition point: it calls
    `buildSnapshot(... provisional: true, includeLive: true)` and returns the
    serializable `AppData` the UI consumes.
  - `app/api/matches/[matchNo]` PATCHes a match; `app/api/stream` is the SSE
    endpoint that re-pushes a fresh `AppData` to every client on each store
    change. `components/useLiveData.ts` consumes the stream.

### Data flow (the live loop)

`/admin` PATCH → `store.update()` persists to `state.json` + notifies → SSE
`stream` route rebuilds `getAppData()` → pushes snapshot → dashboard re-renders.
"Reset" re-seeds from the static schedule, discarding entered results.

## Conventions and known gaps

- **Scope is goals + status only.** No cards are captured, so Article 13's
  fair-play tiebreaker (criterion f) is **intentionally skipped**; the engine
  flags the tie and falls back to FIFA ranking. Don't add card logic without
  also extending the `Match`/`Goal` model and the input UI.
- **Annexe C third-place allocation is a stub** (`apps/web/lib/annexeC.ts`). The
  bracket runs in `provisional: true` mode, so third-place slots show a *computed
  valid matching* (not FIFA's official 495-row lookup) flagged provisional until
  groups finish. Populating the official table makes those slots authoritative.
- **Live tables are provisional:** an in-progress match counts at its current
  scoreline (`includeLive: true`).
- The store is deliberately a JSON file (single-user, ~104 records) behind a
  small `MatchStore` interface — swappable for SQLite/a provider API without
  touching `core` or the routes.
