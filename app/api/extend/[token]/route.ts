import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { days?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const days = typeof body.days === "number" ? Math.trunc(body.days) : NaN;
  if (!Number.isFinite(days) || days < 1 || days > 3) {
    return NextResponse.json({ error: "Perpanjangan maksimal 3 hari." }, { status: 400 });
  }

  const match = await db.orm.public.Match.first({ confirmToken: token });
  if (!match) {
    return NextResponse.json({ error: "Link tidak valid." }, { status: 404 });
  }
  if (match.extensionDays) {
    return NextResponse.json(
      { error: "Kamu sudah mengajukan perpanjangan sebelumnya." },
      { status: 409 },
    );
  }

  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

  await db.orm.public.Match.where({ id: match.id }).update({
    extensionDays: days,
    extensionRequestedAt: Temporal.Now.instant(),
    extensionReason: reason || null,
  });

  return NextResponse.json({ ok: true });
}
