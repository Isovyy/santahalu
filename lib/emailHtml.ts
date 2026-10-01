export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Who participants should ping with questions — update here each event.
export const ADMIN_CONTACT_HANDLE = "@FATUIUWU";

// Hard deadline for gift uploads — update here each event. End-of-day WIB.
export const SUBMISSION_DEADLINE = new Date("2026-12-15T23:59:59+07:00");

export function formatDeadline(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}
