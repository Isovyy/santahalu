import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashEditCode } from "@/lib/editCode";

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Looks a participant up by their private edit code alone, so the register
// page can prefill the form for editing. Never returns editCodeHash itself.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const editCode = str(body.editCode);
  if (!editCode) {
    return NextResponse.json({ error: "Kode edit wajib diisi." }, { status: 400 });
  }

  const participant = await db.orm.public.Participant.first({
    editCodeHash: hashEditCode(editCode),
  });

  if (!participant) {
    return NextResponse.json({ error: "Kode edit tidak ditemukan." }, { status: 404 });
  }

  const { editCodeHash: _editCodeHash, ...safe } = participant;

  return NextResponse.json({ ok: true, participant: safe });
}
