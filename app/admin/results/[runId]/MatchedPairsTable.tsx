"use client";

import { useEffect, useRef, useState } from "react";
import type { ResultRow } from "@/lib/results";

// Stored as "Character | Fandom; Character | Fandom" — reformat for display
// only (the raw pipe/semicolon format stays as-is for CSV export elsewhere).
function formatAvoidList(raw: string): string {
  if (!raw) return "-";
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [character, fandom] = entry.split("|").map((s) => s.trim());
      return fandom ? `${character} (${fandom})` : character;
    })
    .join(", ");
}

interface Column {
  label: string;
  width: number;
  wrap?: boolean;
  render: (row: ResultRow) => React.ReactNode;
}

const COLUMNS: Column[] = [
  { label: "Yumeship", width: 160, render: (r) => r.receiver_yumeship_name },
  {
    label: "Oshi",
    width: 220,
    render: (r) => (
      <>
        {r.giver_oshi_name} &rarr; {r.receiver_oshi_name}
      </>
    ),
  },
  {
    label: "Fandom",
    width: 220,
    wrap: true,
    render: (r) => (
      <>
        {r.giver_fandom_give} &rarr; {r.receiver_fandom_yume}
      </>
    ),
  },
  {
    label: "Bahasa yang diberi → diterima",
    width: 220,
    render: (r) => (
      <>
        {r.giver_language_give || "-"} &rarr; {r.receiver_language_receive || "-"}
      </>
    ),
  },
  { label: "Giver's avoid list", width: 220, render: (r) => formatAvoidList(r.giver_avoid_list) },
  { label: "Giver", width: 140, render: (r) => r.giver_twt_user },
  { label: "Giver email", width: 200, render: (r) => r.giver_email },
  { label: "Receiver", width: 140, render: (r) => r.receiver_twt_user },
  { label: "Receiver email", width: 200, render: (r) => r.receiver_email },
];

const MIN_WIDTH = 60;
const PAGE_SIZE = 35;

export default function MatchedPairsTable({ rows }: { rows: ResultRow[] }) {
  const [widths, setWidths] = useState<number[]>(COLUMNS.map((c) => c.width));
  const [isDragging, setIsDragging] = useState(false);
  const [page, setPage] = useState(1);
  const drag = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // Prevent text selection and show a consistent cursor for the whole page
  // while dragging — without this, fast mouse movement during the drag can
  // select surrounding text instead of just resizing. Done as an effect
  // (rather than mutating document.body directly in the event handlers)
  // since that's a DOM side effect, not a render concern.
  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    function onMouseMove(e: MouseEvent) {
      if (!drag.current) return;
      const { index, startX, startWidth } = drag.current;
      const next = Math.max(MIN_WIDTH, startWidth + (e.clientX - startX));
      setWidths((w) => w.map((width, i) => (i === index ? next : width)));
    }

    function onMouseUp() {
      drag.current = null;
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  function startResize(index: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      drag.current = { index, startX: e.clientX, startWidth: widths[index] };
      setIsDragging(true);
    };
  }

  const totalWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table
          className="divide-y divide-teal-100 text-sm"
          style={{ tableLayout: "fixed", width: totalWidth }}
        >
          <thead className="bg-teal-50 text-teal-600">
            <tr>
              {COLUMNS.map((col, i) => (
                <th
                  key={col.label}
                  style={{ width: widths[i], minWidth: widths[i], maxWidth: widths[i] }}
                  className="relative select-none overflow-hidden px-4 py-2 text-left font-medium"
                >
                  <span className="block truncate pr-2">{col.label}</span>
                  <span
                    onMouseDown={startResize(i)}
                    role="separator"
                    aria-orientation="vertical"
                    title="Drag to resize"
                    className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-teal-300 active:bg-teal-400"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {pageRows.map((row, i) => (
              <tr key={i} className="text-gray-600">
                {COLUMNS.map((col, ci) => {
                  const content = col.render(row);
                  return (
                    <td
                      key={col.label}
                      style={{ width: widths[ci], minWidth: widths[ci], maxWidth: widths[ci] }}
                      className={col.wrap ? "break-words px-4 py-2" : "truncate px-4 py-2"}
                      title={!col.wrap && typeof content === "string" ? content : undefined}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-gray-400">
                  No matched pairs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            {rows.length} pasangan &middot; halaman {clampedPage} dari {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={clampedPage === 1}
              onClick={() => setPage(clampedPage - 1)}
              className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 hover:bg-teal-50 disabled:opacity-40"
            >
              &lsaquo; Sebelumnya
            </button>
            <button
              type="button"
              disabled={clampedPage === pageCount}
              onClick={() => setPage(clampedPage + 1)}
              className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 hover:bg-teal-50 disabled:opacity-40"
            >
              Berikutnya &rsaquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
