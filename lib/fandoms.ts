// Shared between the register form's fandom fields (app/RegisterFields.tsx)
// and the admin "Flagged" view (app/admin/responses/*): a plain data module
// (no "use client", no React) so both a client component and a server
// component can import it without any RSC boundary ambiguity.

import { OSHI_DATA } from "@/lib/oshi-data";

const FANDOM_YUME_OPTIONS = [
  "Arknights",
  "Blue Lock",
  "Bungou Stray Dogs",
  "Ensemble Stars",
  "Demon Slayer",
  "Fate/Grand Order",
  "Genshin Impact",
  "HELIOS Rising Heroes",
  "Honkai: Star Rail",
  "Hypnosis Microphone",
  "IDOLiSH7",
  "Love and Deepspace",
  "Mahoyaku",
  "My Hero Academia",
  "Obey Me",
  "Paradox Live",
  "Project Sekai: Colorful Stage",
  "Tears of Themis",
  "Tokyo Debunker",
  "Touken Ranbu",
  "Twisted Wonderland",
  "Zenless Zone Zero",
];

// One shared list so a receiver's fandom always matches a giver's accepted fandom.
export const FANDOM_ALL = Array.from(
  new Set([...FANDOM_YUME_OPTIONS, ...OSHI_DATA.map((d) => d.fandom)]),
).sort((a, b) => a.localeCompare(b));
