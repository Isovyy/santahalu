import { db } from "@/lib/db";
import { generateConfirmToken } from "@/lib/confirmToken";
import { confirmRoundOf, reassignedGiverTwts, type ConfirmRound } from "@/lib/confirmRound";

export interface NotifyRow {
  matchId: string;
  giverEmail: string;
  giverTwt: string;
  receiverTwt: string;
  receiverEmail: string;
  receiverOshiName: string;
  receiverFandomYume: string;
  receiverRelationshipType: string;
  receiverYumeTypeReceive: string | null;
  receiverLanguageReceive: string;
  receiverYumeDocuLink: string;
  receiverFolderLink: string;
  receiverFolderSharedWith: string | null;
  notifiedAt: string | null;
  folderNotifiedAt: string | null;
  confirmToken: string | null;
  confirmedAt: string | null;
  reportedAt: string | null;
  reportNote: string | null;
  submittedAt: string | null;
  extensionDays: number | null;
  extensionRequestedAt: string | null;
  extensionReason: string | null;
  confirmRound: ConfirmRound;
}

export async function getNotifyRows(
  runId: string,
): Promise<{ rows: NotifyRow[] } | null> {
  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) return null;
  const reassigned = await reassignedGiverTwts(runId);

  const rows: NotifyRow[] = run.matches
    .map((m) => ({
      matchId: m.id,
      giverEmail: m.giver.email,
      giverTwt: m.giver.twtUser,
      receiverTwt: m.receiver.twtUser,
      receiverEmail: m.receiver.email,
      receiverOshiName: m.receiver.oshiName,
      receiverFandomYume: m.receiver.fandomYume,
      receiverRelationshipType: m.receiver.relationshipType,
      receiverYumeTypeReceive: m.receiver.yumeTypeReceive,
      receiverLanguageReceive: m.receiver.languageReceive,
      receiverYumeDocuLink: m.receiver.yumeDocuLink,
      receiverFolderLink: m.receiver.folderLink ?? "",
      receiverFolderSharedWith: m.receiver.folderSharedWith,
      notifiedAt: m.notifiedAt ? m.notifiedAt.toString() : null,
      folderNotifiedAt: m.folderNotifiedAt ? m.folderNotifiedAt.toString() : null,
      confirmToken: m.confirmToken,
      confirmedAt: m.confirmedAt ? m.confirmedAt.toString() : null,
      reportedAt: m.reportedAt ? m.reportedAt.toString() : null,
      reportNote: m.reportNote,
      submittedAt: m.submittedAt ? m.submittedAt.toString() : null,
      extensionDays: m.extensionDays,
      extensionRequestedAt: m.extensionRequestedAt ? m.extensionRequestedAt.toString() : null,
      extensionReason: m.extensionReason,
      confirmRound: confirmRoundOf(m.giver.twtUser, reassigned),
    }))
    .sort((a, b) => a.giverTwt.localeCompare(b.giverTwt, "en", { sensitivity: "base" }));

  return { rows };
}

// Called right before the match-info email is sent, so the email can embed
// a working /confirm/[token] link. Idempotent: reuses the existing token
// once one exists, rather than invalidating a link already emailed out.
export async function ensureConfirmToken(matchId: string): Promise<string> {
  const match = await db.orm.public.Match.first({ id: matchId });
  if (!match) throw new Error("Match not found");
  if (match.confirmToken) return match.confirmToken;

  const token = generateConfirmToken();
  await db.orm.public.Match.where({ id: matchId }).update({ confirmToken: token });
  return token;
}
