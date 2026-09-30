"use client";

import { useMemo, useState } from "react";
import {
  QUESTIONS,
  formatTimestamp,
  parseAvoid,
  splitMulti,
  valuesOf,
  type ParticipantRow,
  type Question,
} from "./fields";
import EditParticipantForm from "./EditParticipantForm";
import { FANDOM_ALL } from "@/lib/fandoms";

type Tab = "summary" | "question" | "individual" | "table" | "flagged";

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "question", label: "Question" },
  { id: "individual", label: "Individual" },
  { id: "table", label: "Table" },
];

interface Filters {
  q: string;
  relationship: string;
  fandom: string;
  content: string;
  langRecv: string;
  fandomGive: string;
  yumeRecv: string;
  hasAvoid: boolean;
}

const NO_FILTERS: Filters = {
  q: "",
  relationship: "",
  fandom: "",
  content: "",
  langRecv: "",
  fandomGive: "",
  yumeRecv: "",
  hasAvoid: false,
};

const ANY_FANDOM = "apa saja";

interface FlaggedIssue {
  field: string;
  value: string;
}

// Free-text fandom fields (register form + avoid-list) let people type anything,
// so this surfaces entries that don't match the known fandom list — likely a
// typo, or a genuinely new fandom worth a quick human look either way.
function flagRow(row: ParticipantRow): FlaggedIssue[] {
  const known = (v: string) => FANDOM_ALL.some((f) => f.toLowerCase() === v.toLowerCase());
  const issues: FlaggedIssue[] = [];

  if (row.fandomYume && !known(row.fandomYume)) {
    issues.push({ field: "Fandom yumeshipmu", value: row.fandomYume });
  }

  for (const f of splitMulti(row.fandomGive)) {
    if (f.toLowerCase() === ANY_FANDOM) continue;
    if (!known(f)) issues.push({ field: "Fandom yang bersedia kamu buatkan hadiah", value: f });
  }

  for (const a of parseAvoid(row.avoidList)) {
    if (a.fandom && !known(a.fandom)) {
      issues.push({ field: "Karakter yang ingin dihindari (fandom)", value: a.fandom });
    }
  }

  return issues;
}

function applyFilters(rows: ParticipantRow[], f: Filters): ParticipantRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (q) {
      const hay = [r.email, r.twtUser, r.yumeshipName, r.oshiName, r.fandomYume, r.fandomGive, r.notes, r.avoidList]
        .join("\n")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.relationship && r.relationshipType !== f.relationship) return false;
    if (f.fandom && r.fandomYume !== f.fandom) return false;
    if (f.yumeRecv && r.yumeTypeReceive !== f.yumeRecv) return false;
    if (f.content && !splitMulti(r.contentType).includes(f.content)) return false;
    if (f.langRecv && !splitMulti(r.languageReceive).includes(f.langRecv)) return false;
    if (f.fandomGive) {
      // A giver who accepts "Apa saja" accepts every fandom.
      const accepted = splitMulti(r.fandomGive).map((x) => x.toLowerCase());
      if (!accepted.includes(f.fandomGive.toLowerCase()) && !accepted.includes(ANY_FANDOM)) return false;
    }
    if (f.hasAvoid && parseAvoid(r.avoidList).length === 0) return false;
    return true;
  });
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const selectClass =
  "rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300";

export default function ResponsesView({ participants }: { participants: ParticipantRow[] }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState<Question["key"]>(QUESTIONS[0].key);

  const filtered = useMemo(() => applyFilters(participants, filters), [participants, filters]);

  const options = useMemo(
    () => ({
      relationship: uniqueSorted(participants.map((p) => p.relationshipType)),
      fandom: uniqueSorted(participants.map((p) => p.fandomYume)),
      content: uniqueSorted(participants.flatMap((p) => splitMulti(p.contentType))),
      langRecv: uniqueSorted(participants.flatMap((p) => splitMulti(p.languageReceive))),
      fandomGive: uniqueSorted(participants.flatMap((p) => splitMulti(p.fandomGive))),
      yumeRecv: uniqueSorted(participants.map((p) => p.yumeTypeReceive)),
    }),
    [participants],
  );

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const flagged = useMemo(
    () => participants.map((r) => ({ row: r, issues: flagRow(r) })).filter((x) => x.issues.length > 0),
    [participants],
  );

  const tabs = [
    ...BASE_TABS,
    { id: "flagged" as const, label: flagged.length > 0 ? `Flagged (${flagged.length})` : "Flagged" },
  ];

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function openIndividual(id: string) {
    setSelectedId(id);
    setTab("individual");
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-teal-500">
            {isFiltered ? `${filtered.length} of ${participants.length}` : participants.length}{" "}
            <span className="text-2xl">responses</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">Secret Santa registrations</p>
        </div>
        {/* File download from an API route, not a page navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/export/participants"
          className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-teal-50"
        >
          Download responses (.csv)
        </a>
      </div>

      {/* Tabs */}
      <div role="tablist" className="mt-6 flex gap-1 border-b border-teal-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-teal-400 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters: one row above the content they scope. Flagged ignores them by design (it's a review queue, not a filtered view). */}
      {tab !== "flagged" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-teal-100 bg-white p-3 shadow-sm">
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search name, email, oshi..."
            className="min-w-[12rem] flex-1 rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <FilterSelect label="Tipe Yumeship" value={filters.relationship} options={options.relationship} onChange={(v) => setFilter("relationship", v)} />
          <FilterSelect label="Yumeship type" value={filters.yumeRecv} options={options.yumeRecv} onChange={(v) => setFilter("yumeRecv", v)} />
          <FilterSelect label="Fandom" value={filters.fandom} options={options.fandom} onChange={(v) => setFilter("fandom", v)} />
          <FilterSelect label="Accepts fandom" value={filters.fandomGive} options={options.fandomGive} onChange={(v) => setFilter("fandomGive", v)} />
          <FilterSelect label="Karya" value={filters.content} options={options.content} onChange={(v) => setFilter("content", v)} />
          <FilterSelect label="Bahasa diterima" value={filters.langRecv} options={options.langRecv} onChange={(v) => setFilter("langRecv", v)} />
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={filters.hasAvoid} onChange={(e) => setFilter("hasAvoid", e.target.checked)} />
            Has avoid list
          </label>
          {isFiltered && (
            <button
              onClick={() => setFilters(NO_FILTERS)}
              className="rounded-lg px-2 py-1.5 text-sm text-teal-600 hover:bg-teal-50"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        {tab === "flagged" ? (
          <FlaggedTab flagged={flagged} onOpen={openIndividual} />
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            {participants.length === 0 ? "No responses yet." : "No responses match these filters."}
          </p>
        ) : tab === "summary" ? (
          <div className="space-y-4">
            {QUESTIONS.map((q) => (
              <QuestionCard key={q.key} question={q} rows={filtered} />
            ))}
          </div>
        ) : tab === "question" ? (
          <QuestionTab rows={filtered} questionKey={questionKey} onChange={setQuestionKey} />
        ) : tab === "individual" ? (
          <IndividualTab rows={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <TableTab rows={filtered} onOpen={openIndividual} />
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${selectClass} max-w-[11rem] ${value ? "border-teal-400 bg-teal-50" : ""}`}
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* Summary / Question */

function countValues(rows: ParticipantRow[], q: Question) {
  const counts = new Map<string, number>();
  let answered = 0;
  for (const r of rows) {
    const vals = valuesOf(r, q);
    if (vals.length === 0) continue;
    answered++;
    // A multi-answer respondent counts once per distinct option.
    for (const v of new Set(vals)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const items = Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
  return { items, answered };
}

function QuestionCard({
  question,
  rows,
  fullList,
}: {
  question: Question;
  rows: ParticipantRow[];
  fullList?: boolean;
}) {
  const answeredRows = rows.filter((r) => valuesOf(r, question).length > 0);
  const isChoice = question.kind === "single" || question.kind === "multi";

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-medium text-gray-800">{question.label}</h2>
      <p className="mb-4 text-xs text-gray-400">
        {answeredRows.length} {answeredRows.length === 1 ? "response" : "responses"}
      </p>

      {answeredRows.length === 0 ? (
        <p className="text-sm text-gray-400">No responses.</p>
      ) : isChoice ? (
        <BarList {...countValues(rows, question)} />
      ) : (
        <TextAnswers question={question} rows={answeredRows} initial={fullList ? Infinity : 8} />
      )}
    </section>
  );
}

// Single-series horizontal bars: one hue, thin, 4px rounded data end, value at the tip.
function BarList({ items, answered }: { items: { label: string; count: number }[]; answered: number }) {
  const [showAll, setShowAll] = useState(false);
  const max = Math.max(1, ...items.map((i) => i.count));
  const shown = showAll ? items : items.slice(0, 10);

  return (
    <div>
      <ul className="space-y-2">
        {shown.map((i) => {
          const pct = Math.round((i.count / answered) * 100);
          return (
            <li
              key={i.label}
              title={`${i.label}: ${i.count} (${pct}%)`}
              className="group grid grid-cols-[minmax(5rem,12rem)_1fr] items-center gap-3 text-sm"
            >
              <span className="truncate text-gray-600">{i.label}</span>
              <span className="flex items-center gap-2 border-l border-teal-100">
                <span
                  className="h-4 rounded-r-[4px] bg-teal-400 transition group-hover:bg-teal-500"
                  style={{ width: `${Math.max((i.count / max) * 100, 1.5)}%`, maxWidth: "calc(100% - 4.5rem)" }}
                />
                <span className="whitespace-nowrap font-medium text-gray-700">
                  {i.count} <span className="font-normal text-gray-400">({pct}%)</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {items.length > 10 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 text-sm text-teal-600 hover:underline"
        >
          {showAll ? "Show top 10" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

function TextAnswers({
  question,
  rows,
  initial,
}: {
  question: Question;
  rows: ParticipantRow[];
  initial: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, initial);

  return (
    <div>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id} className="rounded-lg bg-teal-50/60 px-3 py-2 text-sm text-gray-700">
            <AnswerValue row={r} question={question} />
            {question.key !== "twtUser" && (
              <span className="ml-2 text-xs text-gray-400">{r.twtUser}</span>
            )}
          </li>
        ))}
      </ul>
      {rows.length > initial && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-3 text-sm text-teal-600 hover:underline">
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

function AnswerValue({ row, question }: { row: ParticipantRow; question: Question }) {
  const value = row[question.key];
  if (!value) return <span className="text-gray-300">-</span>;

  if (question.kind === "link") {
    const safe = /^https?:\/\//i.test(value);
    return safe ? (
      <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-teal-600 hover:underline">
        {value}
      </a>
    ) : (
      <span className="break-all">{value}</span>
    );
  }
  if (question.kind === "avoid") {
    return (
      <span className="inline-flex flex-wrap gap-1.5">
        {parseAvoid(value).map((a, i) => (
          <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-600">
            {a.character} <span className="text-emerald-400">({a.fandom})</span>
          </span>
        ))}
      </span>
    );
  }
  if (question.kind === "multi") {
    return (
      <span className="inline-flex flex-wrap gap-1.5">
        {splitMulti(value).map((v) => (
          <span key={v} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">
            {v}
          </span>
        ))}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{value}</span>;
}

function QuestionTab({
  rows,
  questionKey,
  onChange,
}: {
  rows: ParticipantRow[];
  questionKey: Question["key"];
  onChange: (k: Question["key"]) => void;
}) {
  const question = QUESTIONS.find((q) => q.key === questionKey) ?? QUESTIONS[0];
  const isChoice = question.kind === "single" || question.kind === "multi";

  return (
    <div className="space-y-4">
      <select
        aria-label="Question"
        value={question.key}
        onChange={(e) => onChange(e.target.value as Question["key"])}
        className={`${selectClass} w-full max-w-md`}
      >
        {QUESTIONS.map((q) => (
          <option key={q.key} value={q.key}>
            {q.label}
          </option>
        ))}
      </select>

      <QuestionCard question={question} rows={rows} fullList />

      {isChoice && (
        <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Who answered what</h3>
          <ul className="divide-y divide-teal-100 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-gray-600">{r.twtUser}</span>
                <AnswerValue row={r} question={question} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* Individual */

function IndividualTab({
  rows,
  selectedId,
  onSelect,
}: {
  rows: ParticipantRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const found = rows.findIndex((r) => r.id === selectedId);
  const index = found === -1 ? 0 : found;
  const row = rows[index];
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          aria-label="Previous response"
          disabled={index === 0}
          onClick={() => onSelect(rows[index - 1].id)}
          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-teal-50 disabled:opacity-40"
        >
          ‹
        </button>
        <span className="text-sm text-gray-600">
          <input
            type="number"
            min={1}
            max={rows.length}
            value={index + 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= rows.length) onSelect(rows[n - 1].id);
            }}
            className="w-16 rounded-lg border border-teal-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />{" "}
          of {rows.length}
        </span>
        <button
          aria-label="Next response"
          disabled={index === rows.length - 1}
          onClick={() => onSelect(rows[index + 1].id)}
          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-teal-50 disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <article className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Submitted {formatTimestamp(row.createdAt)}</p>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50"
            >
              Edit jawaban
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-4">
            <EditParticipantForm
              row={row}
              onCancel={() => setEditing(false)}
              onSaved={() => setEditing(false)}
            />
          </div>
        ) : (
          <dl className="mt-4 space-y-5">
            {QUESTIONS.map((q) => (
              <div key={q.key}>
                <dt className="text-sm font-medium text-gray-800">{q.label}</dt>
                <dd className="mt-1 text-sm text-gray-600">
                  <AnswerValue row={row} question={q} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </article>
    </div>
  );
}

/* Table */

type SortKey = "createdAt" | Question["key"];

function TableTab({ rows, onOpen }: { rows: ParticipantRow[]; onOpen: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const out = [...rows].sort((a, b) =>
      String(a[sortKey]).localeCompare(String(b[sortKey]), "en", { sensitivity: "base", numeric: true }),
    );
    return dir === "asc" ? out : out.reverse();
  }, [rows, sortKey, dir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "createdAt", label: "Timestamp" },
    ...QUESTIONS.map((q) => ({ key: q.key, label: q.label })),
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-teal-100 text-sm">
        <thead className="bg-teal-50 text-teal-700">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                aria-sort={sortKey === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                className="whitespace-nowrap px-3 py-2 text-left font-medium"
              >
                <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:underline">
                  {c.label}
                  <span className="text-xs text-teal-400">
                    {sortKey === c.key ? (dir === "asc" ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-teal-100">
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="cursor-pointer text-gray-600 hover:bg-teal-50/60"
            >
              <td className="whitespace-nowrap px-3 py-2 text-gray-400">{formatTimestamp(r.createdAt)}</td>
              {QUESTIONS.map((q) => (
                <td key={q.key} className="max-w-[16rem] truncate px-3 py-2" title={r[q.key]}>
                  {r[q.key] || <span className="text-gray-300">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Flagged */

function FlaggedTab({
  flagged,
  onOpen,
}: {
  flagged: { row: ParticipantRow; issues: FlaggedIssue[] }[];
  onOpen: (id: string) => void;
}) {
  if (flagged.length === 0) {
    return (
      <p className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
        Tidak ada fandom yang perlu ditinjau. Semua jawaban cocok dengan daftar fandom yang ada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {flagged.length} peserta menulis fandom yang tidak ada di daftar (bisa jadi typo, atau memang fandom baru).
      </p>
      <ul className="divide-y divide-teal-100 rounded-2xl border border-teal-100 bg-white shadow-sm">
        {flagged.map(({ row, issues }) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-gray-800">{row.twtUser || row.email}</p>
              <ul className="mt-1 space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    {issue.field}: <span className="font-medium text-amber-600">{issue.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onOpen(row.id)}
              className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50"
            >
              Tinjau &amp; edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
