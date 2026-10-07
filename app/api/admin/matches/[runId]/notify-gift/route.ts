import { NextRequest, NextResponse } from "next/server";
import { getNotifyRows } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { GIFT_EMAIL_SUBJECT, giftEmailHtml } from "@/lib/giftEmail";

type SendOutcome = "sent" | "no_folder_link" | "not_found" | "failed";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  let body: { matchIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const matchIds = Array.isArray(body.matchIds)
    ? body.matchIds.filter((id): id is string => typeof id === "string")
    : [];
  if (matchIds.length === 0) {
    return NextResponse.json({ error: "No matches selected" }, { status: 400 });
  }

  const notifyData = await getNotifyRows(runId);
  if (!notifyData) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  const byId = new Map(notifyData.rows.map((r) => [r.matchId, r]));

  const results: Record<string, SendOutcome> = {};

  for (const matchId of matchIds) {
    const row = byId.get(matchId);
    if (!row) {
      results[matchId] = "not_found";
      continue;
    }
    if (!row.receiverFolderLink) {
      results[matchId] = "no_folder_link";
      continue;
    }
    try {
      await sendEmail({
        to: row.receiverEmail,
        subject: GIFT_EMAIL_SUBJECT,
        html: giftEmailHtml(row),
      });
      results[matchId] = "sent";
    } catch (err) {
      console.error("notify-gift send failed", matchId, err);
      results[matchId] = "failed";
    }
  }

  return NextResponse.json({ ok: true, results });
}
