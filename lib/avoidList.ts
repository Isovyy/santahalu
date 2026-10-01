export const AVOID_WHOLE_FANDOM = "Semua Karakter";

// Stored as "Character | Fandom; Character | Fandom". Reformat for display
// only (the raw pipe/semicolon format stays as-is for CSV export elsewhere).
export function formatAvoidList(raw: string): string {
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
