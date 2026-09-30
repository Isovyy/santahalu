import type { NotifyRow } from "@/lib/notify";

export const FOLDER_EMAIL_SUBJECT = "Santahalu26: Link Folder Upload Hadiah";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function folderEmailHtml(row: NotifyRow): string {
  return `
<p>Halo ${escapeHtml(row.giverTwt)},</p>
<p>Folder untuk upload hadiah kamu untuk ${escapeHtml(row.receiverTwt)} sudah siap:</p>
<p><a href="${escapeHtml(row.receiverFolderLink)}">${escapeHtml(row.receiverFolderLink)}</a></p>
<p>Upload hadiahmu ke folder tersebut sebelum deadline. Kalau butuh perpanjangan waktu, hubungi admin.</p>
`.trim();
}
