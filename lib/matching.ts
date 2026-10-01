// Secret Santa / YumeFess greedy matcher — ported from the original Google
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
  // "Character | Fandom" entries separated by ";" — characters this giver does not want to make gifts for.
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
    // just the one named — so it matches regardless of the receiver's oshi.
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

  // Language: only relevant if the giver might write — a giver who doesn't
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

function shuffleWithinConstraintGroups(
  order: number[],
  candidates: Record<number, number[]>,
  rng: () => number
): number[] {
  const groups: Record<number, number[]> = {};
  order.forEach((i) => {
    const key = candidates[i].length;
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  });

  const result: number[] = [];
  Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((key) => {
      const group = groups[key];
      shuffle(group, rng);
      result.push(...group);
    });

  return result;
}

export function matchParticipants(
  participants: MatchParticipant[],
  seed?: number | null
): MatchResult {
  const rng = seedRandom(seed ?? Date.now());
  const matches: Array<[number, number]> = [];

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

  // Giver order: shuffle, then sort by fewest options, then shuffle within groups
  let giverOrder = participants.map((_, i) => i);
  shuffle(giverOrder, rng);
  giverOrder.sort((a, b) => candidates[a].length - candidates[b].length);
  giverOrder = shuffleWithinConstraintGroups(giverOrder, candidates, rng);

  // Receiver popularity
  const receiverPopularity: Record<number, number> = {};
  Object.values(candidates).forEach((candList) => {
    candList.forEach((j) => {
      receiverPopularity[j] = (receiverPopularity[j] || 0) + 1;
    });
  });

  const availableReceivers = new Set(participants.map((_, i) => i));

  giverOrder.forEach((i) => {
    const viable = candidates[i].filter((j) => availableReceivers.has(j));
    if (viable.length === 0) return;

    shuffle(viable, rng);
    viable.sort((a, b) => (receiverPopularity[a] || 0) - (receiverPopularity[b] || 0));

    const cutoffIdx = Math.max(1, Math.floor(viable.length / 3));
    const j = viable[Math.floor(rng() * cutoffIdx)];

    matches.push([i, j]);
    availableReceivers.delete(j);
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
