import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const REQUIRED_FIELDS = [
  "email",
  "twtUser",
  "yumeshipName",
  "oshiName",
  "relationshipType",
  "fandomYume",
  "contentType",
  "languageReceive",
  "fandomGive",
  "yumeDocuLink",
] as const;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: "You must confirm you understand the event rules." },
      { status: 400 }
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (!str(body[field])) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  // languageGive is only required when the participant offers Writing.
  if (str(body.contentType).includes("Writing") && !str(body.languageGive)) {
    return NextResponse.json(
      { error: "Missing required field: languageGive" },
      { status: 400 }
    );
  }

  const email = str(body.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
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
    // Not asked anymore: everyone is treated as willing to make any yumeship type.
    yumeTypeGive: str(body.yumeTypeGive) || "All",
    yumeDocuLink: str(body.yumeDocuLink),
    yumeTypeReceive: str(body.yumeTypeReceive) || null,
    languageGive: str(body.languageGive) || null,
    notes: str(body.notes) || null,
    avoidList: str(body.avoidList).slice(0, 2000) || null,
  };

  const participant = await db.orm.public.Participant.upsert({
    create: data,
    update: data,
    conflictOn: { email },
  });

  return NextResponse.json({ ok: true, id: participant.id });
}
