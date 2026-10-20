import { db } from "@/lib/db";

// Which /confirm link round a pair belongs to:
//   #1 — the pair is still exactly as the original matching made it.
//   #2 — the giver was (re)assigned afterwards by a reshuffle, auto-solve,
//        force-match or restore.
// Derived from MatchReshuffleLog (every one of those writes a log entry for
// the giver) instead of a column on Match, so pairs reshuffled before rounds
// existed are classified correctly too.
export type ConfirmRound = 1 | 2;

export async function reassignedGiverTwts(runId: string): Promise<Set<string>> {
  const logs = await db.orm.public.MatchReshuffleLog.where({ matchRunId: runId }).all();
  return new Set(logs.map((l) => l.giverTwt));
}

export function confirmRoundOf(giverTwt: string, reassigned: Set<string>): ConfirmRound {
  return reassigned.has(giverTwt) ? 2 : 1;
}

export function isRoundClosed(
  run: { confirmationClosedAt: unknown; confirmation2ClosedAt: unknown },
  round: ConfirmRound,
): boolean {
  return Boolean(round === 2 ? run.confirmation2ClosedAt : run.confirmationClosedAt);
}
