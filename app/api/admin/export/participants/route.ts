import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

const HEADERS = [
  "timestamp",
  "email",
  "twt_user",
  "yumeship_name",
  "fandom_yume",
  "oshi_name",
  "relationship_type",
  "yume_type_receive",
  "content_type",
  "language_receive",
  "language_give",
  "fandom_give",
  "avoid_list",
  "yume_docu_link",
  "notes",
];

export async function GET() {
  const participants = await db.orm.public.Participant.orderBy((p) => p.createdAt.asc()).all();

  const csv = toCsv(
    HEADERS,
    participants.map((p) => [
      p.createdAt.toString(),
      p.email,
      p.twtUser,
      p.yumeshipName,
      p.fandomYume,
      p.oshiName,
      p.relationshipType,
      p.yumeTypeReceive ?? "",
      p.contentType,
      p.languageReceive,
      p.languageGive ?? "",
      p.fandomGive,
      p.avoidList ?? "",
      p.yumeDocuLink,
      p.notes ?? "",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="participants.csv"',
    },
  });
}
