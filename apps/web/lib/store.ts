import fs from "node:fs";
import path from "node:path";
import type { Goal, Match, MatchStatus } from "@wc26/core";
import { schedule } from "@wc26/data";
import { Redis } from "@upstash/redis";

const KV_KEY = "wc26:state";

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

function seedState(): PersistedState {
  return { version: 1, matches: structuredClone(schedule) as Match[] };
}

function applyUpdate(match: Match, u: MatchUpdate): void {
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
    const team = (side === "home" ? match.homeTeam : match.awayTeam) ?? side;
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
}

// ─── KV-backed store (Vercel production) ─────────────────────────────────────
// Uses @upstash/redis with the env vars Vercel KV auto-injects:
//   KV_REST_API_URL, KV_REST_API_TOKEN
// KVMatchStore is only instantiated when KV_REST_API_URL is present (see
// createStore below), so the Redis client is always constructed with real values.

class KVMatchStore {
  private readonly redis: Redis;
  private listeners = new Set<Listener>();

  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private async readState(): Promise<PersistedState> {
    const state = await this.redis.get<PersistedState>(KV_KEY);
    if (state && Array.isArray(state.matches) && state.matches.length > 0) {
      return state;
    }
    const fresh = seedState();
    await this.redis.set(KV_KEY, fresh);
    return fresh;
  }

  async getState(): Promise<PersistedState> {
    return this.readState();
  }

  async update(matchNo: number, u: MatchUpdate): Promise<Match> {
    const state = await this.readState();
    const match = state.matches.find((m) => m.matchNo === matchNo);
    if (!match) throw new Error(`Unknown match ${matchNo}`);
    applyUpdate(match, u);
    state.version += 1;
    await this.redis.set(KV_KEY, state);
    this.notify();
    return match;
  }

  async reset(): Promise<void> {
    const current = await this.readState();
    const fresh = { ...seedState(), version: current.version + 1 };
    await this.redis.set(KV_KEY, fresh);
    this.notify();
  }
}

// ─── File-backed store (local dev — no KV env vars) ──────────────────────────

class FileMatchStore {
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
    const seeded = seedState();
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

  async getState(): Promise<PersistedState> {
    return { version: this.state.version, matches: this.state.matches };
  }

  async update(matchNo: number, u: MatchUpdate): Promise<Match> {
    const match = this.state.matches.find((m) => m.matchNo === matchNo);
    if (!match) throw new Error(`Unknown match ${matchNo}`);
    applyUpdate(match, u);
    this.state.version += 1;
    this.persist(this.state);
    this.notify();
    return match;
  }

  async reset(): Promise<void> {
    this.state = { ...seedState(), version: this.state.version + 1 };
    this.persist(this.state);
    this.notify();
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
// Cached on globalThis so it survives Next.js dev HMR re-evaluation.
// In KV mode, state lives in Redis so the in-process singleton is stateless.

type Store = KVMatchStore | FileMatchStore;

const globalRef = globalThis as unknown as { __wc26Store?: Store };

function createStore(): Store {
  if (process.env.KV_REST_API_URL) return new KVMatchStore();
  return new FileMatchStore();
}

export const store: Store = globalRef.__wc26Store ?? createStore();
if (!globalRef.__wc26Store) globalRef.__wc26Store = store;
