import type { NotifyRow } from "@/lib/notify";
import { escapeHtml } from "@/lib/emailHtml";

export const FOLDER_EMAIL_SUBJECT = "Santahalu26: Link Folder Upload Hadiah";

export function folderEmailHtml(row: NotifyRow, submitUrl: string): string {
  return `
<p>Halo ${escapeHtml(row.giverTwt)},</p>
<p>Folder untuk upload hadiah kamu untuk ${escapeHtml(row.receiverTwt)} sudah siap:</p>
<p><a href="${escapeHtml(row.receiverFolderLink)}">${escapeHtml(row.receiverFolderLink)}</a></p>
<p>Upload hadiahmu ke folder tersebut sebelum deadline. Kalau butuh perpanjangan waktu, hubungi admin.</p>
<p>Setelah selesai upload, tandai di link ini: <a href="${escapeHtml(submitUrl)}">${escapeHtml(submitUrl)}</a></p>
`.trim();
}
