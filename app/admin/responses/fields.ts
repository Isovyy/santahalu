// Shared between the responses page (server) and its client view. Keep this
// module free of server-only imports.

export interface ParticipantRow {
  id: string;
  createdAt: string; // ISO
  email: string;
  twtUser: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  fandomYume: string;
  contentType: string;
  languageReceive: string;
  languageGive: string;
  fandomGive: string;
  yumeTypeReceive: string;
  yumeDocuLink: string;
  notes: string;
  avoidList: string;
  folderLink: string;
}

export type QuestionKind = "text" | "single" | "multi" | "avoid" | "link";

export interface Question {
  key: Exclude<keyof ParticipantRow, "id" | "createdAt">;
  label: string;
  kind: QuestionKind;
}

// Order and titles mirror the registration form.
export const QUESTIONS: Question[] = [
  { key: "email", label: "Email", kind: "text" },
  { key: "twtUser", label: "Username twitter", kind: "text" },
  { key: "yumeshipName", label: "Nama yumeship", kind: "text" },
  { key: "fandomYume", label: "Fandom yumeshipmu", kind: "single" },
  { key: "oshiName", label: "Nama cc/oshi", kind: "text" },
  { key: "relationshipType", label: "Tipe Yumeship", kind: "single" },
  { key: "yumeTypeReceive", label: "Yumeship type", kind: "single" },
  { key: "contentType", label: "Karya yang kamu beri berupa", kind: "multi" },
  { key: "languageReceive", label: "Bahasa yang bersedia kamu terima", kind: "multi" },
  { key: "languageGive", label: "Bahasa yang bersedia kamu tulis", kind: "multi" },
  { key: "fandomGive", label: "Fandom yang bersedia kamu buatkan hadiah", kind: "multi" },
  { key: "avoidList", label: "Karakter yang ingin dihindari", kind: "avoid" },
  { key: "yumeDocuLink", label: "Dokumen Yumeship", kind: "link" },
  { key: "notes", label: "Notes", kind: "text" },
  { key: "folderLink", label: "Link folder Drive (untuk terima hadiah)", kind: "link" },
];

export function splitMulti(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface AvoidItem {
  character: string;
  fandom: string;
}

// Stored as "Character | Fandom; Character | Fandom".
export function parseAvoid(value: string): AvoidItem[] {
  return value
    .split(";")
    .map((entry) => {
      const [character = "", fandom = ""] = entry.split("|");
      return { character: character.trim(), fandom: fandom.trim() };
    })
    .filter((a) => a.character);
}

// Fixed zone so server render and browser render agree (no hydration mismatch).
const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function formatTimestamp(iso: string): string {
  return timestampFormat.format(new Date(iso));
}

// Values of a question as a list, whatever its kind (used by filters, summary).
export function valuesOf(row: ParticipantRow, q: Question): string[] {
  const v = row[q.key];
  if (!v) return [];
  if (q.kind === "multi") return splitMulti(v);
  if (q.kind === "avoid") return parseAvoid(v).map((a) => `${a.character} (${a.fandom})`);
  return [v];
}
