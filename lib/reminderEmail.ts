import type { NotifyRow } from "@/lib/notify";
import { escapeHtml, ADMIN_CONTACT_HANDLE, SUBMISSION_DEADLINE, formatDeadline } from "@/lib/emailHtml";

export const REMINDER_EMAIL_SUBJECT = "Reminder: Hard Deadline Upload Hadiah Secret Santa";

export function reminderEmailHtml(row: NotifyRow, confirmUrl: string, extendUrl: string): string {
  return `
<p>Hello ${escapeHtml(row.giverTwt)},</p>
<p>Note: Abaikan email bila sudah mengumpulkan hadiah.</p>
<p>Reminder HARD DEADLINE upload hadiah Santahalu26 adalah ${escapeHtml(formatDeadline(SUBMISSION_DEADLINE))}.</p>
<p>Kegagalan dalam memenuhi kewajiban memberi hadiah tanpa kabar akan di-BLOCK oleh yumefess,
di-BLACKLIST dari event-event selanjutnya, dan kami akan membuat post di @mlytfess terkait
akun-akun yang tidak mengumpulkan hadiah tanpa kabar.</p>
<p>Untuk rekap penerima anda sekaligus link drive silahkan cek email sebelumnya. Tolong dicatat
bahwa drive hanya bisa dibuka oleh email terdaftar.</p>
<p>Konfirmasi ulang di link ini: <a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
<p>Butuh perpanjangan waktu (maks 3 hari)? Ajukan di link ini: <a href="${escapeHtml(extendUrl)}">${escapeHtml(extendUrl)}</a></p>
<p>Jika ada pertanyaan atau perkara silahkan reply email ini atau hubungi ${escapeHtml(ADMIN_CONTACT_HANDLE)}.</p>
<p>Happy gifting! \u{1F496}</p>
`.trim();
}
