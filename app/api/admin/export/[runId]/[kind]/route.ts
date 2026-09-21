import { NextRequest, NextResponse } from "next/server";
import { getMatchRunResults, ALL_COLUMNS, UNMATCHED_COLUMNS } from "@/lib/results";
import { toCsv } from "@/lib/csv";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; kind: string }> }
) {
  const { runId, kind } = await params;

  if (kind !== "all" && kind !== "unmatched") {
    return NextResponse.json({ error: "kind must be 'all' or 'unmatched'" }, { status: 400 });
  }

  const results = await getMatchRunResults(runId);
  if (!results) {
    return NextResponse.json({ error: "Match run not found" }, { status: 404 });
  }

  let csv: string;
  let filename: string;

  if (kind === "all") {
    csv = toCsv(
      ALL_COLUMNS as unknown as string[],
      results.rows.map((row) => ALL_COLUMNS.map((c) => row[c]))
    );
    filename = `results_all_${runId}.csv`;
  } else {
    csv = toCsv(
      UNMATCHED_COLUMNS as unknown as string[],
      results.unmatched.map((p) => [
        p.email,
        p.twtUser,
        p.yumeshipName,
        p.oshiName,
        p.relationshipType,
        p.yumeTypeReceive,
        p.fandomYume,
        p.contentType,
        p.languageGive ?? "",
        p.languageReceive ?? "",
        p.fandomGive ?? "",
        p.yumeTypeGive ?? "",
        p.yumeDocuLink ?? "",
        p.notes ?? "",
        p.avoidList ?? "",
      ])
    );
    filename = `results_unmatched_${runId}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
