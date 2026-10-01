export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Who participants should ping with questions — update here each event.
export const ADMIN_CONTACT_HANDLE = "@FATUIUWU";
