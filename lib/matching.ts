// Secret Santa / YumeFess greedy matcher, ported from the original Google
// Apps Script (Code.gs) so match behavior stays identical, including the
// seeded RNG, so a given seed still reproduces the same result.

import { AVOID_WHOLE_FANDOM } from "./avoidList";

export interface MatchParticipant {
  id: string;
  oshiName: string;
  fandomGive?: string | null;
  fandomYume: string;
  languageGive?: string | null;
  languageReceive?: string | null;
  yumeTypeGive?: string | null;
  yumeTypeReceive?: string | null;
  contentType: string;
  // "Character | Fandom" entries separated by ";", characters this giver does not want to make gifts for.
  avoidList?: string | null;
}

export interface MatchStats {
  totalParticipants: number;
  matchedPairs: number;
  matchedIndividuals: number;
  unmatched: number;
}

export interface MatchResult {
  matches: Array<[number, number]>; // [giverIndex, receiverIndex]
  stats: MatchStats;
}

export interface BipartiteStats {
  totalGivers: number;
  totalReceivers: number;
  matchedPairs: number;
  unmatchedGivers: number;
  unmatchedReceivers: number;
}

export interface BipartiteResult {
  matches: Array<[number, number]>; // [giverIndex into `givers`, receiverIndex into `receivers`]
  stats: BipartiteStats;
}

function normalize(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseMulti(s: string | null | undefined): string[] {
  if (!s || typeof s !== "string") return [];
  return s
    .split(/[;,/]/)
    .map((x) => normalize(x))
    .filter((x) => x.length > 0);
}

// Token-sorted so "Isagi Yoichi" and "Yoichi Isagi" count as the same character.
function normalizeCharacter(s: string | null | undefined): string {
  return normalize(s).split(" ").filter(Boolean).sort().join(" ");
}

const AVOID_WHOLE_FANDOM_NORMALIZED = normalizeCharacter(AVOID_WHOLE_FANDOM);

function isAvoided(giver: MatchParticipant, receiver: MatchParticipant): boolean {
  if (!giver.avoidList) return false;
  const recvChar = normalizeCharacter(receiver.oshiName);
  const recvFandom = normalize(receiver.fandomYume);
  return giver.avoidList.split(";").some((entry) => {
    const [character, fandom] = entry.split("|");
    if (normalize(fandom) !== recvFandom) return false;
    // A "whole fandom" entry excludes every character in that fandom, not
    // just the one named, so it matches regardless of the receiver's oshi.
    if (normalizeCharacter(character) === AVOID_WHOLE_FANDOM_NORMALIZED) return true;
    return normalizeCharacter(character) === recvChar;
  });
}

export function canGiveTo(giver: MatchParticipant, receiver: MatchParticipant): boolean {
  const giverOshi = normalize(giver.oshiName);
  const recvOshi = normalize(receiver.oshiName);

  // Rule 1: no same-oshi pairing
  if (giverOshi && recvOshi && giverOshi === recvOshi) {
    return false;
  }

  // Rule 2: never assign a character the giver asked to avoid
  if (isAvoided(giver, receiver)) {
    return false;
  }

  let fandomGive = parseMulti(giver.fandomGive);
  if (fandomGive.length === 0) fandomGive = ["apa saja"];

  const fandomRecv = parseMulti(receiver.fandomYume);
  if (fandomRecv.length === 0) return false;

  let langGive = parseMulti(giver.languageGive);
  if (langGive.length === 0) langGive = ["apa saja"];

  let langRecv = parseMulti(receiver.languageReceive);
  if (langRecv.length === 0) langRecv = ["apa saja"];

  let yumeGive = parseMulti(giver.yumeTypeGive);
  if (yumeGive.length === 0) yumeGive = ["apa saja"];

  let yumeRecv = parseMulti(receiver.yumeTypeReceive);
  if (yumeRecv.length === 0) yumeRecv = ["apa saja"];

  const contentGive = normalize(giver.contentType);
  const giverHasWriting = contentGive.includes("writing");

  const fandomGiveSet = new Set(fandomGive);
  const fandomRecvSet = new Set(fandomRecv);
  const langGiveSet = new Set(langGive);
  const langRecvSet = new Set(langRecv);
  const yumeGiveSet = new Set(yumeGive);
  const yumeRecvSet = new Set(yumeRecv);

  // Fandom: giver can gift anyone if they list "apa saja"
  let fandomOk = false;
  for (const f of fandomGiveSet) {
    if (f.includes("apa saja")) {
      fandomOk = true;
      break;
    }
  }
  if (!fandomOk) {
    for (const f of fandomGiveSet) {
      if (fandomRecvSet.has(f)) {
        fandomOk = true;
        break;
      }
    }
  }

  // Language: only relevant if the giver might write. A giver who doesn't
  // offer Writing at all (pure Art) bypasses it, regardless of the receiver's
  // accepted languages. A giver who offers Writing (even alongside Art) still
  // needs a language match, since they could end up writing for this receiver.
  let langOk = false;
  if (langRecvSet.has("apa saja")) {
    langOk = true;
  } else if (!giverHasWriting) {
    langOk = true;
  } else {
    for (const l of langGiveSet) {
      if (langRecvSet.has(l)) {
        langOk = true;
        break;
      }
    }
  }

  // Yume type: receiver's type must intersect giver's list ("all" wildcards)
  let yumeOk = false;
  if (yumeGiveSet.has("all")) {
    yumeOk = true;
  } else {
    for (const y of yumeGiveSet) {
      if (yumeRecvSet.has(y)) {
        yumeOk = true;
        break;
      }
    }
  }

  return fandomOk && langOk && yumeOk;
}

function seedRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Maximum bipartite matching via Kuhn's algorithm (augmenting paths).
//
// A one-pass greedy assignment (try each giver once, take the first free
// compatible receiver) can strand people even when a full solution exists:
// if giver A (compatible with {X, Y}) grabs X before giver B (compatible
// with only {X}) gets a turn, B is stuck with no receiver, even though
// A->Y, B->X would have matched everyone. Kuhn's algorithm fixes this by
// letting a giver "bump" whoever currently holds a receiver they want, as
// long as the bumped giver can be rerouted to another option (recursively).
// This guarantees the largest possible matching, not just whatever the
// first pass happened to grab, at the cost of no longer being able to
// cheaply bias toward unpopular receivers (dropped, since correctness
// matters more than that secondary fairness heuristic).
function maxBipartiteMatch(
  giverCount: number,
  receiverCount: number,
  candidates: Record<number, number[]>,
  rng: () => number
): number[] {
  const matchOfReceiver = new Array(receiverCount).fill(-1);
  const matchOfGiver = new Array(giverCount).fill(-1);

  function tryAugment(giver: number, visited: boolean[]): boolean {
    const options = [...candidates[giver]];
    shuffle(options, rng);
    for (const receiver of options) {
      if (visited[receiver]) continue;
      visited[receiver] = true;
      if (matchOfReceiver[receiver] === -1 || tryAugment(matchOfReceiver[receiver], visited)) {
        matchOfReceiver[receiver] = giver;
        matchOfGiver[giver] = receiver;
        return true;
      }
    }
    return false;
  }

  const giverOrder = Array.from({ length: giverCount }, (_, i) => i);
  shuffle(giverOrder, rng);

  for (const giver of giverOrder) {
    tryAugment(giver, new Array(receiverCount).fill(false));
  }

  return matchOfGiver;
}

export function matchParticipants(
  participants: MatchParticipant[],
  seed?: number | null
): MatchResult {
  const rng = seedRandom(seed ?? Date.now());

  // Precompute compatible receivers per giver (excluding self)
  const candidates: Record<number, number[]> = {};
  participants.forEach((giver, i) => {
    candidates[i] = [];
    participants.forEach((receiver, j) => {
      if (i !== j && canGiveTo(giver, receiver)) {
        candidates[i].push(j);
      }
    });
  });

  const matchOfGiver = maxBipartiteMatch(participants.length, participants.length, candidates, rng);
  const matches: Array<[number, number]> = [];
  matchOfGiver.forEach((receiverIdx, giverIdx) => {
    if (receiverIdx !== -1) matches.push([giverIdx, receiverIdx]);
  });

  const matchedIndividuals = new Set(matches.flat());

  return {
    matches,
    stats: {
      totalParticipants: participants.length,
      matchedPairs: matches.length,
      matchedIndividuals: matchedIndividuals.size,
      unmatched: participants.length - matchedIndividuals.size,
    },
  };
}

// Re-pairs a specific set of "broken" givers against a specific set of
// "broken" receivers, used for reshuffling a reported/pulled-in subset of
// an existing match run, where each side is already a fixed, separate list
// (unlike matchParticipants, which treats one pool as both roles at once).
// A person can legitimately appear in both lists (e.g. they're the giver in
// one pulled-in row and the receiver in another), so self-pairing is guarded
// by id, not array identity.
export function matchBipartite(
  givers: MatchParticipant[],
  receivers: MatchParticipant[],
  seed?: number | null
): BipartiteResult {
  const rng = seedRandom(seed ?? Date.now());

  const candidates: Record<number, number[]> = {};
  givers.forEach((giver, i) => {
    candidates[i] = [];
    receivers.forEach((receiver, j) => {
      if (giver.id !== receiver.id && canGiveTo(giver, receiver)) {
        candidates[i].push(j);
      }
    });
  });

  const matchOfGiver = maxBipartiteMatch(givers.length, receivers.length, candidates, rng);
  const matches: Array<[number, number]> = [];
  matchOfGiver.forEach((receiverIdx, giverIdx) => {
    if (receiverIdx !== -1) matches.push([giverIdx, receiverIdx]);
  });

  return {
    matches,
    stats: {
      totalGivers: givers.length,
      totalReceivers: receivers.length,
      matchedPairs: matches.length,
      unmatchedGivers: givers.length - matches.length,
      unmatchedReceivers: receivers.length - matches.length,
    },
  };
}
