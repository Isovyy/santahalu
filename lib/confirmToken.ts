import { randomBytes } from "crypto";

// Embedded directly in the confirm/report link sent by email (/confirm/[token]),
// so it needs to be unguessable, not human-typeable: no alphabet restriction
// needed like lib/editCode.ts's codes.
export function generateConfirmToken(): string {
  return randomBytes(24).toString("base64url");
}
