import type {
  BracketMatch,
  BracketParticipant,
  GroupId,
  GroupRanking,
  Match,
  SlotSource,
  Stage,
} from "./types";

/** Static description of a knockout match: its number, stage, and two sources. */
export interface BracketMatchTemplate {
  matchNo: number;
  stage: Stage;
  home: SlotSource;
  away: SlotSource;
}

export interface ResolveBracketInput {
  /** The M73–M104 knockout template (from the data package). */
  template: readonly BracketMatchTemplate[];
  /** Group rankings keyed by group id. */
  rankings: Map<GroupId, GroupRanking>;
  /** All matches, keyed access by matchNo for knockout scores/winners. */
  matches: readonly Match[];
  /**
   * Resolved third-place allocation: maps a third-place slot key (the candidate
   * group set, e.g. "ABCDF") to the group whose third-placed team fills it.
   * Provided by the data layer (Annexe C) once all groups are complete; when
   * absent, third-place slots stay pending.
   */
  thirdPlaceAllocation?: Map<string, GroupId>;
  /**
   * Fill group (and third-place) slots from the *current* standings even before
   * a group is finished, marking such participants `provisional`. When false
   * (default), slots only fill once their group is complete.
   */
  provisional?: boolean;
  includeLive?: boolean;
}

/** Canonical key for a third-place candidate group set: sorted, concatenated. */
export function thirdPlaceSlotKey(groups: readonly GroupId[]): string {
  return [...groups].sort().join("");
}

function labelFor(source: SlotSource): string {
  switch (source.kind) {
    case "groupWinner":
      return `1${source.group}`;
    case "groupRunnerUp":
      return `2${source.group}`;
    case "thirdPlace":
      return `3rd ${source.groups.join("/")}`;
    case "matchWinner":
      return `W${source.matchNo}`;
    case "matchLoser":
      return `L${source.matchNo}`;
  }
}

interface SlotFill {
  teamId: string | null;
  provisional: boolean;
}

function fromGroupPosition(
  ranking: GroupRanking | undefined,
  position: number,
  provisional: boolean,
): SlotFill {
  if (!ranking) return { teamId: null, provisional: false };
  const teamId = ranking.rows[position]?.teamId ?? null;
  if (ranking.complete) return { teamId, provisional: false };
  if (provisional) return { teamId, provisional: true };
  return { teamId: null, provisional: false };
}

export function resolveBracket(input: ResolveBracketInput): BracketMatch[] {
  const { template, rankings, thirdPlaceAllocation } = input;
  const provisional = input.provisional ?? false;
  const matchByNo = new Map(input.matches.map((m) => [m.matchNo, m]));
  const winners = new Map<number, string | null>();
  const losers = new Map<number, string | null>();
  const allGroupsComplete = [...rankings.values()].every((r) => r.complete);

  const resolve = (source: SlotSource): BracketParticipant => {
    const label = labelFor(source);
    let teamId: string | null = null;
    let prov = false;
    switch (source.kind) {
      case "groupWinner": {
        const f = fromGroupPosition(rankings.get(source.group), 0, provisional);
        teamId = f.teamId;
        prov = f.provisional;
        break;
      }
      case "groupRunnerUp": {
        const f = fromGroupPosition(rankings.get(source.group), 1, provisional);
        teamId = f.teamId;
        prov = f.provisional;
        break;
      }
      case "thirdPlace": {
        if ((provisional || allGroupsComplete) && thirdPlaceAllocation) {
          const assigned = thirdPlaceAllocation.get(thirdPlaceSlotKey(source.groups));
          if (assigned) {
            const f = fromGroupPosition(rankings.get(assigned), 2, provisional);
            teamId = f.teamId;
            // Confirmed once all groups are complete (official Annexe C allocation);
            // provisional during group stage.
            prov = provisional && !allGroupsComplete;
          }
        }
        break;
      }
      case "matchWinner":
        teamId = winners.get(source.matchNo) ?? null;
        break;
      case "matchLoser":
        teamId = losers.get(source.matchNo) ?? null;
        break;
    }
    const participant: BracketParticipant = { source, teamId, label };
    if (prov && teamId) participant.provisional = true;
    return participant;
  };

  const out: BracketMatch[] = [];
  // Ascending matchNo is also topological order: winner refs always point back.
  const ordered = [...template].sort((a, b) => a.matchNo - b.matchNo);
  for (const tpl of ordered) {
    const home = resolve(tpl.home);
    const away = resolve(tpl.away);
    const match = matchByNo.get(tpl.matchNo);
    const status: Match["status"] = match?.status ?? "scheduled";
    const showScore = match != null && status !== "scheduled";

    let winner: string | null = null;
    if (
      match &&
      match.status === "finished" &&
      home.teamId &&
      away.teamId
    ) {
      if (match.winnerTeam) {
        winner = match.winnerTeam;
      } else if (match.homeScore > match.awayScore) {
        winner = home.teamId;
      } else if (match.awayScore > match.homeScore) {
        winner = away.teamId;
      }
      // A draw with no explicit winnerTeam stays undecided (needs penalties).
    }
    winners.set(tpl.matchNo, winner);
    losers.set(
      tpl.matchNo,
      winner && home.teamId && away.teamId
        ? winner === home.teamId
          ? away.teamId
          : home.teamId
        : null,
    );

    out.push({
      matchNo: tpl.matchNo,
      stage: tpl.stage,
      home,
      away,
      status,
      homeScore: showScore ? match!.homeScore : null,
      awayScore: showScore ? match!.awayScore : null,
      winner,
    });
  }

  return out;
}
