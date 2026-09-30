import { formatEditCode } from "@/lib/editCode";

export const REGISTRATION_EMAIL_SUBJECT = "Santahalu — Kode Edit Kamu";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function registrationEmailHtml(twtUser: string, editCode: string): string {
  return `
<p>Halo ${escapeHtml(twtUser)},</p>
<p>Terima kasih sudah mendaftar untuk Santahalu!</p>
<p>Ini kode edit kamu:</p>
<p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${escapeHtml(formatEditCode(editCode))}</p>
<p>Kode ini juga ditampilkan sekali di layar setelah kamu submit form.</p>
`.trim();
}
