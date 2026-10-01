import type { NotifyRow } from "@/lib/notify";
import { escapeHtml, ADMIN_CONTACT_HANDLE } from "@/lib/emailHtml";

export const MATCH_EMAIL_SUBJECT = "Your Santahalu26 Match!";

export function matchEmailHtml(row: NotifyRow, confirmUrl: string, extendUrl: string): string {
  return `
<p>Halo ${escapeHtml(row.giverTwt)},</p>
<p>Inilah penerima hadiah anda untuk Santahalu! \u{1F381}</p>
<p><strong>Receiver's details:</strong></p>
<ul>
  <li>Fandom: ${escapeHtml(row.receiverFandomYume)}</li>
  <li>Oshi: ${escapeHtml(row.receiverOshiName)}</li>
  <li>Yume Type: ${escapeHtml(row.receiverRelationshipType)}</li>
  <li>Languages: ${escapeHtml(row.receiverLanguageReceive)}</li>
  <li>Docs: <a href="${escapeHtml(row.receiverYumeDocuLink)}">${escapeHtml(row.receiverYumeDocuLink)}</a></li>
</ul>
<p>Mohon diperhatikan terutama fandom dan preferensi bahasa bagi para penulis, lalu
konfirmasi bila tidak ada masalah. Dihimbau untuk tidak membuat hadiah terlebih dahulu, karena
kita akan memberi waktu 2x24 jam bagi semua peserta untuk konfirmasi ulang. Disini masih dapat
terjadi reshuffle pasangan dan akan diumumkan sekitar pertengahan hingga akhir minggu depan
tergantung situasi dan kondisi.</p>
<p>Bila ada kesalahan dari pihak kami (mendapat doubles/fandom tidak sesuai, dll) mohon
langsung lapor melalui link dibawah.</p>
<p>Konfirmasi ulang di link ini: <a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
<p>Butuh perpanjangan waktu (maks 3 hari)? Ajukan di link ini: <a href="${escapeHtml(extendUrl)}">${escapeHtml(extendUrl)}</a></p>
<p>Jika ada pertanyaan atau perkara silahkan menghubungi ${escapeHtml(ADMIN_CONTACT_HANDLE)}.</p>
<p>Happy gifting! \u{1F496}</p>
`.trim();
}
