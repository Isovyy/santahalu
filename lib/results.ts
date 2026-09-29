import { db } from "@/lib/db";

// Column order mirrors the original Apps Script `Results_All` sheet output
// (createAllSheet's orderedCols) so any existing downstream tooling that
// expects that shape keeps working against these CSV exports.
export const ALL_COLUMNS = [
  "receiver_folder_link",
  "giver_email",
  "giver_twt_user",
  "receiver_email",
  "receiver_twt_user",
  "giver_content_type",
  "receiver_content_type",
  "giver_fandom_yume",
  "receiver_fandom_yume",
  "giver_fandom_give",
  "receiver_fandom_give",
  "giver_language_give",
  "receiver_language_give",
  "giver_language_receive",
  "receiver_language_receive",
  "giver_notes",
  "receiver_notes",
  "giver_oshi_name",
  "receiver_oshi_name",
  "giver_yume_docu_link",
  "receiver_yume_docu_link",
  "giver_relationship_type",
  "receiver_relationship_type",
  "giver_yume_type_give",
  "receiver_yume_type_give",
  "giver_yume_type_receive",
  "receiver_yume_type_receive",
  "giver_yumeship_name",
  "receiver_yumeship_name",
  "giver_avoid_list",
  "receiver_avoid_list",
] as const;

export const UNMATCHED_COLUMNS = [
  "email",
  "twt_user",
  "yumeship_name",
  "oshi_name",
  "relationship_type",
  "yume_type_receive",
  "fandom_yume",
  "content_type",
  "language_give",
  "language_receive",
  "fandom_give",
  "yume_type_give",
  "yume_docu_link",
  "notes",
  "avoid_list",
] as const;

interface ParticipantLike {
  email: string;
  twtUser: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  fandomYume: string;
  contentType: string;
  languageReceive: string;
  fandomGive: string;
  yumeTypeGive: string;
  yumeDocuLink: string;
  yumeTypeReceive: string | null;
  languageGive: string | null;
  notes: string | null;
  folderLink: string | null;
  avoidList: string | null;
}

function fieldMap(p: ParticipantLike): Record<string, string> {
  return {
    email: p.email,
    twt_user: p.twtUser,
    yumeship_name: p.yumeshipName,
    oshi_name: p.oshiName,
    relationship_type: p.relationshipType,
    yume_type_receive: p.yumeTypeReceive ?? "",
    fandom_yume: p.fandomYume,
    content_type: p.contentType,
    language_give: p.languageGive ?? "",
    language_receive: p.languageReceive ?? "",
    fandom_give: p.fandomGive ?? "",
    yume_type_give: p.yumeTypeGive ?? "",
    yume_docu_link: p.yumeDocuLink ?? "",
    notes: p.notes ?? "",
    folder_link: p.folderLink ?? "",
    avoid_list: p.avoidList ?? "",
  };
}

function classifyRow(giverTwt: string, receiverTwt: string): number {
  if (giverTwt && !receiverTwt) return 1;
  if (receiverTwt && !giverTwt) return 2;
  if (giverTwt && receiverTwt) return 3;
  return 4;
}

function sortKey(giverTwt: string, receiverTwt: string): string {
  const key = giverTwt.trim() || receiverTwt.trim();
  return key.toLowerCase().replace(/@/g, "");
}

export async function getMatchRunResults(runId: string) {
  const run = await db.orm.public.MatchRun
    .include("matches", (m) => m.include("giver").include("receiver"))
    .first({ id: runId });
  if (!run) return null;

  const participants = await db.orm.public.Participant.orderBy((p) => p.twtUser.asc()).all();

  const receiverToGiver = new Map<string, (typeof run.matches)[number]["giver"]>();
  run.matches.forEach((m) => receiverToGiver.set(m.receiverId, m.giver));

  const rows = participants.map((participant) => {
    const giver = receiverToGiver.get(participant.id);
    const receiverFields = fieldMap(participant);
    const giverFields = giver ? fieldMap(giver) : null;

    const row: Record<string, string> = {};
    for (const col of ALL_COLUMNS) {
      if (col.startsWith("giver_")) {
        const key = col.slice("giver_".length);
        row[col] = giverFields ? giverFields[key] ?? "" : "";
      } else {
        const key = col.slice("receiver_".length);
        row[col] = receiverFields[key] ?? "";
      }
    }
    return row;
  });

  rows.sort((a, b) => {
    const groupA = classifyRow(a.giver_twt_user, a.receiver_twt_user);
    const groupB = classifyRow(b.giver_twt_user, b.receiver_twt_user);
    if (groupA !== groupB) return groupA - groupB;
    return sortKey(a.giver_twt_user, a.receiver_twt_user).localeCompare(
      sortKey(b.giver_twt_user, b.receiver_twt_user)
    );
  });

  const matchedIds = new Set(run.matches.flatMap((m) => [m.giverId, m.receiverId]));
  const unmatched = participants.filter((p) => !matchedIds.has(p.id));

  return { run, rows, unmatched, totalCurrentParticipants: participants.length };
}
