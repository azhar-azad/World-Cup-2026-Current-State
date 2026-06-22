import fs from "node:fs";
import path from "node:path";
import type { Goal, Match, MatchStatus } from "@wc26/core";
import { schedule } from "@wc26/data";

/**
 * Tiny JSON-file match store. Single-user, ~104 records, so a file is plenty —
 * and it avoids native build tools. All mutation goes through `update`, which
 * persists and notifies subscribers (used by the SSE stream). The store sits
 * behind this small surface so it could be swapped for SQLite later without
 * touching the routes.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "state.json");

export interface MatchUpdate {
  status?: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  /** Explicit winner for a drawn knockout match (penalties). */
  winnerTeam?: string | null;
  /** Add a goal to one side (increments that side's score). */
  addGoal?: { side: "home" | "away"; minute?: number };
  /** Remove a previously-added goal by id (decrements its side's score). */
  removeGoalId?: string;
}

interface PersistedState {
  version: number;
  matches: Match[];
}

type Listener = () => void;

class MatchStore {
  private state: PersistedState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): PersistedState {
    try {
      const raw = fs.readFileSync(FILE, "utf-8");
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed?.matches) && parsed.matches.length > 0) {
        return { version: parsed.version ?? 1, matches: parsed.matches };
      }
    } catch {
      // no file yet — fall through to seeding
    }
    const seeded: PersistedState = {
      version: 1,
      matches: structuredClone(schedule) as Match[],
    };
    this.persist(seeded);
    return seeded;
  }

  private persist(state: PersistedState): void {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2), "utf-8");
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  get version(): number {
    return this.state.version;
  }

  getMatches(): Match[] {
    return this.state.matches;
  }

  getMatch(matchNo: number): Match | undefined {
    return this.state.matches.find((m) => m.matchNo === matchNo);
  }

  update(matchNo: number, u: MatchUpdate): Match {
    const match = this.getMatch(matchNo);
    if (!match) throw new Error(`Unknown match ${matchNo}`);

    if (u.status !== undefined) match.status = u.status;
    if (typeof u.homeScore === "number") {
      match.homeScore = Math.max(0, Math.trunc(u.homeScore));
    }
    if (typeof u.awayScore === "number") {
      match.awayScore = Math.max(0, Math.trunc(u.awayScore));
    }
    if (u.winnerTeam !== undefined) match.winnerTeam = u.winnerTeam;

    if (u.addGoal) {
      const { side, minute } = u.addGoal;
      const team =
        (side === "home" ? match.homeTeam : match.awayTeam) ?? side;
      const goal: Goal = { id: crypto.randomUUID(), team, minute };
      match.goals.push(goal);
      if (side === "home") match.homeScore += 1;
      else match.awayScore += 1;
    }

    if (u.removeGoalId) {
      const idx = match.goals.findIndex((g) => g.id === u.removeGoalId);
      if (idx >= 0) {
        const [removed] = match.goals.splice(idx, 1);
        const isHome = removed!.team === match.homeTeam || removed!.team === "home";
        if (isHome) match.homeScore = Math.max(0, match.homeScore - 1);
        else match.awayScore = Math.max(0, match.awayScore - 1);
      }
    }

    this.state.version += 1;
    this.persist(this.state);
    this.notify();
    return match;
  }

  /** Re-seed from the static schedule (discards all entered results). */
  reset(): void {
    this.state = {
      version: this.state.version + 1,
      matches: structuredClone(schedule) as Match[],
    };
    this.persist(this.state);
    this.notify();
  }
}

// Survive Next.js dev HMR by caching the singleton on globalThis.
const globalRef = globalThis as unknown as { __wc26Store?: MatchStore };
export const store: MatchStore = globalRef.__wc26Store ?? new MatchStore();
if (!globalRef.__wc26Store) globalRef.__wc26Store = store;
