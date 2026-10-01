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
    const unmatchedIds = new Set<string>();
    const unmatched = [...results.noGiver, ...results.noReceiver].filter((p) => {
      if (unmatchedIds.has(p.id)) return false;
      unmatchedIds.add(p.id);
      return true;
    });
    csv = toCsv(
      [...UNMATCHED_COLUMNS, "unmatched_reason"] as unknown as string[],
      unmatched.map((p) => {
        const reasons: string[] = [];
        if (results.noGiver.includes(p)) reasons.push("no_giver");
        if (results.noReceiver.includes(p)) reasons.push("no_receiver");
        return [
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
          reasons.join(", "),
        ];
      })
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
