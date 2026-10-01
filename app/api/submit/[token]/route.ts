import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const match = await db.orm.public.Match.first({ confirmToken: token });
  if (!match) {
    return NextResponse.json({ error: "Link tidak valid." }, { status: 404 });
  }

  await db.orm.public.Match.where({ id: match.id }).update({
    submittedAt: Temporal.Now.instant(),
  });

  return NextResponse.json({ ok: true });
}
