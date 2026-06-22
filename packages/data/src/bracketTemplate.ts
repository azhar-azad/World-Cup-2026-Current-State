import type { BracketMatchTemplate, GroupId, SlotSource } from "@wc26/core";

// Slot constructors for readability.
const gw = (group: GroupId): SlotSource => ({ kind: "groupWinner", group });
const ru = (group: GroupId): SlotSource => ({ kind: "groupRunnerUp", group });
const tp = (...groups: GroupId[]): SlotSource => ({ kind: "thirdPlace", groups });
const w = (matchNo: number): SlotSource => ({ kind: "matchWinner", matchNo });
const l = (matchNo: number): SlotSource => ({ kind: "matchLoser", matchNo });

/**
 * The complete FIFA World Cup 2026 knockout structure (matches 73–104), from
 * Articles 12.6–12.11 of the official regulations and cross-checked against the
 * openfootball schedule. Match numbers are also the topological resolution
 * order (winner/loser references always point to lower numbers).
 *
 * The five-group sets on the third-place slots are the candidate pools; exactly
 * which of those groups' third-placed team fills each slot is decided by Annexe
 * C once the group stage is complete (see annexeC.ts).
 */
export const bracketTemplate: BracketMatchTemplate[] = [
  // Round of 32
  { matchNo: 73, stage: "R32", home: ru("A"), away: ru("B") },
  { matchNo: 74, stage: "R32", home: gw("E"), away: tp("A", "B", "C", "D", "F") },
  { matchNo: 75, stage: "R32", home: gw("F"), away: ru("C") },
  { matchNo: 76, stage: "R32", home: gw("C"), away: ru("F") },
  { matchNo: 77, stage: "R32", home: gw("I"), away: tp("C", "D", "F", "G", "H") },
  { matchNo: 78, stage: "R32", home: ru("E"), away: ru("I") },
  { matchNo: 79, stage: "R32", home: gw("A"), away: tp("C", "E", "F", "H", "I") },
  { matchNo: 80, stage: "R32", home: gw("L"), away: tp("E", "H", "I", "J", "K") },
  { matchNo: 81, stage: "R32", home: gw("D"), away: tp("B", "E", "F", "I", "J") },
  { matchNo: 82, stage: "R32", home: gw("G"), away: tp("A", "E", "H", "I", "J") },
  { matchNo: 83, stage: "R32", home: ru("K"), away: ru("L") },
  { matchNo: 84, stage: "R32", home: gw("H"), away: ru("J") },
  { matchNo: 85, stage: "R32", home: gw("B"), away: tp("E", "F", "G", "I", "J") },
  { matchNo: 86, stage: "R32", home: gw("J"), away: ru("H") },
  { matchNo: 87, stage: "R32", home: gw("K"), away: tp("D", "E", "I", "J", "L") },
  { matchNo: 88, stage: "R32", home: ru("D"), away: ru("G") },
  // Round of 16
  { matchNo: 89, stage: "R16", home: w(74), away: w(77) },
  { matchNo: 90, stage: "R16", home: w(73), away: w(75) },
  { matchNo: 91, stage: "R16", home: w(76), away: w(78) },
  { matchNo: 92, stage: "R16", home: w(79), away: w(80) },
  { matchNo: 93, stage: "R16", home: w(83), away: w(84) },
  { matchNo: 94, stage: "R16", home: w(81), away: w(82) },
  { matchNo: 95, stage: "R16", home: w(86), away: w(88) },
  { matchNo: 96, stage: "R16", home: w(85), away: w(87) },
  // Quarter-finals
  { matchNo: 97, stage: "QF", home: w(89), away: w(90) },
  { matchNo: 98, stage: "QF", home: w(93), away: w(94) },
  { matchNo: 99, stage: "QF", home: w(91), away: w(92) },
  { matchNo: 100, stage: "QF", home: w(95), away: w(96) },
  // Semi-finals
  { matchNo: 101, stage: "SF", home: w(97), away: w(98) },
  { matchNo: 102, stage: "SF", home: w(99), away: w(100) },
  // Third-place play-off & Final
  { matchNo: 103, stage: "third", home: l(101), away: l(102) },
  { matchNo: 104, stage: "final", home: w(101), away: w(102) },
];
