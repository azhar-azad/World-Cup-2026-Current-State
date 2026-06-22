/**
 * Core domain types for the FIFA World Cup 2026 visualizer.
 *
 * These are framework-free and shared by the rules engine, the data seed,
 * and the Next.js app.
 */

/** The 12 group identifiers, A through L. */
export type GroupId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export const GROUP_IDS: readonly GroupId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

/** Tournament stage of a match. */
export type Stage = "group" | "R32" | "R16" | "QF" | "SF" | "third" | "final";

/** Lifecycle of a single match. */
export type MatchStatus = "scheduled" | "live" | "finished";

export interface Team {
  /** Stable short code used as the primary key, e.g. "MEX", "USA". */
  id: string;
  /** Display name, e.g. "Mexico". */
  name: string;
  /**
   * ISO 3166-1 alpha-2 code (lower-case) used to build a flag image URL,
   * e.g. "mx". Some teams (e.g. England) use sub-region codes handled by the
   * flag helper in the data package.
   */
  iso2: string;
  /**
   * Most recent FIFA/Coca-Cola Men's World Ranking position. Used only for
   * Article 13 tiebreaker (g) when teams are otherwise dead level. Lower is
   * better. Optional because it is rarely needed.
   */
  fifaRanking?: number;
}

export interface Goal {
  id: string;
  /** Team id of the team that scored. */
  team: string;
  /** Match minute, if known. Optional per the "goals + status only" scope. */
  minute?: number;
}

/**
 * How a knockout slot is filled. Group matches carry concrete team ids; bracket
 * matches reference where their participants come from until those resolve.
 */
export type SlotSource =
  | { kind: "groupWinner"; group: GroupId } // "1A"
  | { kind: "groupRunnerUp"; group: GroupId } // "2A"
  | { kind: "thirdPlace"; groups: GroupId[] } // "Best 3rd of {A,B,C,D,F}"
  | { kind: "matchWinner"; matchNo: number } // "W73"
  | { kind: "matchLoser"; matchNo: number }; // "L101" (third-place play-off)

export interface Match {
  /** Stable id, e.g. "M1". */
  id: string;
  /** Official match number 1..104. */
  matchNo: number;
  stage: Stage;
  /** Present for group-stage matches. */
  group?: GroupId;
  /** Resolved home team id, or null/undefined when not yet determined. */
  homeTeam?: string | null;
  /** Resolved away team id, or null/undefined when not yet determined. */
  awayTeam?: string | null;
  kickoff: string; // ISO 8601 datetime (UTC)
  venue?: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  goals: Goal[];
  /**
   * Explicit winner for a knockout match decided by penalties (a draw after
   * regulation). Manually set; ignored for group matches. When unset, the
   * winner is inferred from the score.
   */
  winnerTeam?: string | null;
}

/** Aggregated league-table row for a single team. */
export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/** A standing row plus its resolved 1-based position within the group. */
export interface RankedRow extends StandingRow {
  /** 1-based rank within the group after applying Article 13. */
  position: number;
  /**
   * True when this team's position could only be separated from a level rival
   * by the non-deterministic fallbacks (FIFA ranking / drawing of lots), i.e.
   * the order is not decided by on-pitch results alone. Surfaced so the UI can
   * flag it and offer a manual override.
   */
  unresolvedTie?: boolean;
}

export interface GroupRanking {
  group: GroupId;
  rows: RankedRow[];
  /** True once every match in the group has finished (positions are final). */
  complete: boolean;
}

/** A resolved or pending participant in a bracket match. */
export interface BracketParticipant {
  source: SlotSource;
  /** Resolved team id, or null while pending. */
  teamId: string | null;
  /** Human label to show while pending, e.g. "1A", "W73", "Best 3rd of A/B/C/D/F". */
  label: string;
  /**
   * True when `teamId` reflects the *current* standings rather than a clinched
   * result — i.e. the group isn't finished yet, or (for third-place slots) the
   * slot assignment is the computed provisional matching rather than the
   * official Annexe C allocation. Lets the UI flag it as tentative.
   */
  provisional?: boolean;
}

export interface BracketMatch {
  matchNo: number;
  stage: Stage;
  home: BracketParticipant;
  away: BracketParticipant;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  /** Resolved winner team id, or null while undecided. */
  winner: string | null;
}
