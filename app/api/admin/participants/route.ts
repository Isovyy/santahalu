import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const participants = await prisma.participant.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ participants, count: participants.length });
}
