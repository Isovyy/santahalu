import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateEditCode, hashEditCode } from "@/lib/editCode";
import { sendEmail } from "@/lib/email";
import { REGISTRATION_EMAIL_SUBJECT, registrationEmailHtml } from "@/lib/registrationEmail";

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

  const submittedCode = str(body.editCode);

  if (submittedCode) {
    // Editing: identified by the code itself, not by email, so changing the
    // email as part of an edit works instead of silently creating a duplicate.
    const existing = await db.orm.public.Participant.first({
      editCodeHash: hashEditCode(submittedCode),
    });

    if (!existing) {
      return NextResponse.json({ error: "Kode edit tidak ditemukan." }, { status: 404 });
    }

    if (email !== existing.email) {
      const emailTaken = await db.orm.public.Participant.first({ email });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Email tersebut sudah dipakai oleh peserta lain." },
          { status: 409 }
        );
      }
    }

    const participant = await db.orm.public.Participant
      .where({ id: existing.id })
      .update(data);

    if (!participant) {
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: participant.id });
  }

  // No code supplied: a fresh registration, but guard against silently
  // overwriting someone else's existing entry via a duplicate email.
  const emailTaken = await db.orm.public.Participant.first({ email });
  if (emailTaken) {
    return NextResponse.json(
      {
        error:
          "Email ini sudah terdaftar. Masukkan kode edit yang kamu terima saat pertama kali daftar untuk memperbarui jawabanmu.",
        alreadyRegistered: true,
      },
      { status: 409 }
    );
  }

  const editCode = generateEditCode();
  const participant = await db.orm.public.Participant.create({
    ...data,
    editCodeHash: hashEditCode(editCode),
  });

  // Backup to the on-screen one-time display — best-effort, never blocks
  // registration if Gmail is down or misconfigured.
  try {
    await sendEmail({
      to: email,
      subject: REGISTRATION_EMAIL_SUBJECT,
      html: registrationEmailHtml(data.twtUser, editCode),
    });
  } catch (err) {
    console.error("registration email failed", participant.id, err);
  }

  return NextResponse.json({ ok: true, id: participant.id, editCode });
}
