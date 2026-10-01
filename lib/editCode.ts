import { randomBytes, createHash } from "crypto";

// No 0/O/1/I: avoids characters that are easy to misread when copied by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

// Shown once at registration; the participant needs it (plus their email) to edit later.
export function generateEditCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

// Display-only grouping, e.g. "AB3D-9FQK", cosmetic, stripped before hashing/comparing.
export function formatEditCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalize(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Plain SHA-256 (no salt) is enough here: codes are random high-entropy strings we
// generate ourselves, not user-chosen passwords, so precomputed-table attacks don't
// apply, this just keeps a DB leak from directly exposing usable codes.
export function hashEditCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

export function verifyEditCode(code: string, hash: string): boolean {
  return hashEditCode(code) === hash;
}
