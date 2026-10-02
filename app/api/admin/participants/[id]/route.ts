import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = str(body.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const conflict = await db.orm.public.Participant.first({ email });
  if (conflict && conflict.id !== id) {
    return NextResponse.json(
      { error: "Email tersebut sudah dipakai oleh peserta lain." },
      { status: 409 }
    );
  }

  const data = {
    email,
    twtUser: str(body.twtUser),
    yumeshipName: str(body.yumeshipName),
    oshiName: str(body.oshiName),
    relationshipType: str(body.relationshipType),
    fandomYume: str(body.fandomYume),
    contentType: str(body.contentType),
    languageReceive: str(body.languageReceive),
    fandomGive: str(body.fandomGive),
    yumeDocuLink: str(body.yumeDocuLink),
    languageGive: str(body.languageGive) || null,
    notes: str(body.notes) || null,
    avoidList: str(body.avoidList).slice(0, 2000) || null,
    folderLink: str(body.folderLink) || null,
    yumeTypeReceive: str(body.yumeTypeReceive) || null,
  };

  const participant = await db.orm.public.Participant.where({ id }).update(data);

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: participant.id });
}
