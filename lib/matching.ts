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
  return ruleViolations(giver, receiver).length === 0;
}

// Every matching rule this pairing breaks, as short admin-facing labels
// (empty = allowed). canGiveTo is just "no violations", so the two can never
// disagree about what counts as a valid pair.
export function ruleViolations(giver: MatchParticipant, receiver: MatchParticipant): string[] {
  const violations: string[] = [];
  const giverOshi = normalize(giver.oshiName);
  const recvOshi = normalize(receiver.oshiName);

  // Rule 1: no same-oshi pairing
  if (giverOshi && recvOshi && giverOshi === recvOshi) {
    violations.push("Oshi sama");
  }

  // Rule 2: never assign a character the giver asked to avoid
  if (isAvoided(giver, receiver)) {
    violations.push("Ada di avoid list giver");
  }

  let fandomGive = parseMulti(giver.fandomGive);
  if (fandomGive.length === 0) fandomGive = ["apa saja"];

  const fandomRecv = parseMulti(receiver.fandomYume);
  if (fandomRecv.length === 0) {
    violations.push("Receiver tidak punya fandom");
    return violations;
  }

  let langGive = parseMulti(giver.languageGive);
  if (langGive.length === 0) langGive = ["apa saja"];

  let langRecv = parseMulti(receiver.languageReceive);
  if (langRecv.length === 0) langRecv = ["apa saja"];

  let yumeGive = parseMulti(giver.yumeTypeGive);
  if (yumeGive.length === 0) yumeGive = ["apa saja"];

  let yumeRecv = parseMulti(receiver.yumeTypeReceive);
  // Receiver's ship has no yumeship-type classification at all (Platonic
  // ship, or registered before this field existed), so there's nothing for
  // the giver's own preference to conflict with: don't block on it.
  const receiverHasNoYumeType = yumeRecv.length === 0;
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

  // Yumeship type (HL/GL/BL): giver.yumeTypeGive is "what I'm comfortable
  // creating" (a checklist; everyone defaults to "All" until they fill it
  // in themselves). receiver.yumeTypeReceive is "what my own ship actually
  // is" (single choice, only collected when their relationship has a
  // romantic dimension). At least one of the giver's checked types must
  // overlap with the receiver's, unless the receiver has no classification
  // at all (Platonic ship, or registered before this field existed), in
  // which case there's nothing for the giver's preference to conflict with.
  let yumeOk = false;
  if (yumeGiveSet.has("all") || receiverHasNoYumeType) {
    yumeOk = true;
  } else {
    for (const y of yumeGiveSet) {
      if (yumeRecvSet.has(y)) {
        yumeOk = true;
        break;
      }
    }
  }

  if (!fandomOk) violations.push("Fandom tidak sesuai");
  if (!langOk) violations.push("Bahasa tidak sesuai");
  if (!yumeOk) violations.push("Tipe yume tidak sesuai");
  return violations;
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

// `excludePairs` works the same as in matchBipartite below — pairings
// rejected in an earlier run that a fresh run must not repeat.
export function matchParticipants(
  participants: MatchParticipant[],
  seed?: number | null,
  excludePairs?: Set<string>
): MatchResult {
  const rng = seedRandom(seed ?? Date.now());

  // Precompute compatible receivers per giver (excluding self)
  const candidates: Record<number, number[]> = {};
  participants.forEach((giver, i) => {
    candidates[i] = [];
    participants.forEach((receiver, j) => {
      if (
        i !== j &&
        canGiveTo(giver, receiver) &&
        !excludePairs?.has(`${giver.id}:${receiver.id}`)
      ) {
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
// `excludePairs` keys are `${giverId}:${receiverId}` — pairings that must
// never be proposed even if canGiveTo would otherwise allow them (e.g. a
// giver who already reported a problem with that specific receiver).
export function matchBipartite(
  givers: MatchParticipant[],
  receivers: MatchParticipant[],
  seed?: number | null,
  excludePairs?: Set<string>
): BipartiteResult {
  const rng = seedRandom(seed ?? Date.now());

  const candidates: Record<number, number[]> = {};
  givers.forEach((giver, i) => {
    candidates[i] = [];
    receivers.forEach((receiver, j) => {
      if (
        giver.id !== receiver.id &&
        canGiveTo(giver, receiver) &&
        !excludePairs?.has(`${giver.id}:${receiver.id}`)
      ) {
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

export interface ChainStep {
  giverId: string;
  previousReceiverId: string | null;
  newReceiverId: string;
}

// Finds the SHORTEST chain of reassignments that frees up a receiver for
// `stuckGiverId`, searching the run's full current matching rather than a
// hand-picked subset. This is the same "bump whoever holds the receiver I
// want, as long as they can be rerouted" idea as maxBipartiteMatch's
// tryAugment, but breadth-first instead of depth-first: DFS finds *a*
// augmenting path, BFS finds the *shortest* one, which is what "break the
// fewest existing matches" means here.
//
// `currentReceiverOfGiver` reflects the run's live state (mutate it between
// calls when resolving several stuck givers in sequence, so each search
// sees what the previous one already claimed). Returns null when no chain
// exists at all, even one that breaks everything reachable.
export function findMinimalBreakChain(
  stuckGiverId: string,
  participants: MatchParticipant[],
  currentReceiverOfGiver: Map<string, string>,
  excludePairs: Set<string>
): ChainStep[] | null {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const currentGiverOfReceiver = new Map<string, string>();
  for (const [giverId, receiverId] of currentReceiverOfGiver) {
    currentGiverOfReceiver.set(receiverId, giverId);
  }

  const stuckGiver = byId.get(stuckGiverId);
  if (!stuckGiver) return null;

  // Parent pointers to reconstruct the path once a free receiver is found:
  // for each visited giver node, which receiver got them there and which
  // giver proposed it.
  const arrivedVia = new Map<string, { fromGiverId: string; receiverId: string }>();
  const visitedGivers = new Set<string>([stuckGiverId]);
  const visitedReceivers = new Set<string>();
  const ownCurrentReceiver = currentReceiverOfGiver.get(stuckGiverId) ?? null;
  if (ownCurrentReceiver) visitedReceivers.add(ownCurrentReceiver);

  const queue: string[] = [stuckGiverId];

  // Walks parent pointers from the giver who just found a free receiver
  // back to stuckGiverId, collecting one step per giver along the way. Each
  // step says "this giver moves from whatever they currently hold to the
  // receiver the next giver down the chain wanted from them."
  function buildChain(lastGiverId: string, lastReceiverId: string): ChainStep[] {
    const steps: ChainStep[] = [];
    let giverId: string | null = lastGiverId;
    let receiverId = lastReceiverId;
    while (giverId) {
      steps.unshift({
        giverId,
        previousReceiverId: currentReceiverOfGiver.get(giverId) ?? null,
        newReceiverId: receiverId,
      });
      const arrival = arrivedVia.get(giverId);
      if (!arrival) break;
      receiverId = arrival.receiverId;
      giverId = arrival.fromGiverId;
    }
    return steps;
  }

  while (queue.length > 0) {
    const giverId = queue.shift()!;
    const giver = byId.get(giverId)!;

    for (const receiver of participants) {
      if (receiver.id === giverId) continue;
      if (visitedReceivers.has(receiver.id)) continue;
      if (giverId === stuckGiverId && receiver.id === ownCurrentReceiver) continue;
      if (excludePairs.has(`${giverId}:${receiver.id}`)) continue;
      if (!canGiveTo(giver, receiver)) continue;

      visitedReceivers.add(receiver.id);
      const holder = currentGiverOfReceiver.get(receiver.id);

      if (!holder) {
        // Free receiver (a "No giver" orphan) — chain complete.
        return buildChain(giverId, receiver.id);
      }
      if (!visitedGivers.has(holder)) {
        visitedGivers.add(holder);
        arrivedVia.set(holder, { fromGiverId: giverId, receiverId: receiver.id });
        queue.push(holder);
      }
    }
  }

  return null;
}
