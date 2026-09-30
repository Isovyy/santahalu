import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { getNotifyRows, ensureConfirmToken } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { MATCH_EMAIL_SUBJECT, matchEmailHtml } from "@/lib/matchEmail";

type SendOutcome = "sent" | "not_found" | "failed";

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
    try {
      const token = await ensureConfirmToken(matchId);
      const confirmUrl = new URL(`/confirm/${token}`, req.nextUrl.origin).toString();
      await sendEmail({
        to: row.giverEmail,
        subject: MATCH_EMAIL_SUBJECT,
        html: matchEmailHtml(row, confirmUrl),
      });
      await db.orm.public.Match.where({ id: matchId }).update({
        notifiedAt: Temporal.Now.instant(),
      });
      results[matchId] = "sent";
    } catch (err) {
      console.error("notify send failed", matchId, err);
      results[matchId] = "failed";
    }
  }

  return NextResponse.json({ ok: true, results });
}
