import { db } from "@/lib/db";

// Builds the "never pair these again" set for matching and reshuffling, as
// `${giverId}:${receiverId}` keys (the shape matchParticipants,
// matchBipartite and findMinimalBreakChain take).
//
// Covers every run, not just the one being worked on: a giver who rejected a
// receiver once shouldn't be handed the same person again in a later run
// either.
//
// Records every currently-reported match into RejectedPair first, since a
// reshuffle clears reportedAt on any row it moves (and deleting a run
// cascades its matches away) — after that the table is the only place the
// rejection survives.
//
// Pairs are matched by twitter handle as well as by participant id: someone
// who registered twice gets two Participant rows with the same twtUser, and
// rejecting one of them is rejecting that person, not just that row.
//
// `persist: false` skips writing anything (for read-only pages like the
// playground) — the result is the same set either way.
export async function loadRejectedPairs({ persist = true } = {}): Promise<Set<string>> {
  const stored = await db.orm.public.RejectedPair.all();
  const pairs = stored.map((p) => ({ giverId: p.giverId, receiverId: p.receiverId }));
  const storedKeys = new Set(stored.map((p) => `${p.matchRunId}:${p.giverId}:${p.receiverId}`));

  const reported = await db.orm.public.Match.where((m) => m.reportedAt.isNotNull()).all();
  for (const m of reported) {
    if (storedKeys.has(`${m.matchRunId}:${m.giverId}:${m.receiverId}`)) continue;
    pairs.push({ giverId: m.giverId, receiverId: m.receiverId });
    if (!persist) continue;
    await db.orm.public.RejectedPair.create({
      matchRunId: m.matchRunId,
      giverId: m.giverId,
      receiverId: m.receiverId,
      note: m.reportNote,
    });
  }

  const participants = await db.orm.public.Participant.all();
  const handleOf = new Map(participants.map((p) => [p.id, p.twtUser.trim().toLowerCase()]));
  const idsOfHandle = new Map<string, string[]>();
  for (const [id, handle] of handleOf) {
    idsOfHandle.set(handle, [...(idsOfHandle.get(handle) ?? []), id]);
  }
  const samePerson = (id: string) => idsOfHandle.get(handleOf.get(id) ?? "") ?? [id];

  const excluded = new Set<string>();
  for (const { giverId, receiverId } of pairs) {
    for (const g of samePerson(giverId)) {
      for (const r of samePerson(receiverId)) excluded.add(`${g}:${r}`);
    }
  }
  return excluded;
}
