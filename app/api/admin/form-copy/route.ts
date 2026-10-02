import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { FORM_COPY_DEFAULTS, type FormCopyKey } from "@/lib/formCopy";

export async function PATCH(req: NextRequest) {
  let body: { changes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const changes = body.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return NextResponse.json({ error: "Invalid changes" }, { status: 400 });
  }

  const entries = Object.entries(changes as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[0] in FORM_COPY_DEFAULTS,
  );

  await db.transaction(async (tx) => {
    for (const [key, rawValue] of entries) {
      const value = rawValue.trim();
      const isDefault = value === FORM_COPY_DEFAULTS[key as FormCopyKey];
      if (isDefault || !value) {
        await tx.orm.public.FormCopy.where({ key }).delete();
      } else {
        await tx.orm.public.FormCopy.upsert({
          create: { key, value, updatedAt: Temporal.Now.instant() },
          update: { value, updatedAt: Temporal.Now.instant() },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
