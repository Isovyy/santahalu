import type { NotifyRow } from "@/lib/notify";

export const MATCH_EMAIL_SUBJECT = "Your Santahalu26 Match!";

// Who participants should ping with questions — update here each event.
const ADMIN_CONTACT_HANDLE = "@FATUIUWU";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function matchEmailHtml(row: NotifyRow, confirmUrl: string): string {
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
<p>Mohon diperhatikan terutama preferensi bahasa bagi para penulis dan orientasi ship, lalu
konfirmasi bila tidak ada masalah. Dihimbau untuk tidak membuat hadiah terlebih dahulu, karena
kita akan memberi waktu 2x24 jam bagi semua peserta untuk konfirmasi ulang. Disini masih dapat
terjadi reshuffle pasangan dan akan diumumkan sekitar pertengahan hingga akhir minggu depan
tergantung situasi dan kondisi.</p>
<p>Bila ada kesalahan dari pihak kami (mendapat doubles/fandom tidak sesuai, dll) mohon
langsung lapor melalui link dibawah.</p>
<p>Konfirmasi ulang di link ini: <a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
<p>Jika ada pertanyaan atau perkara silahkan menghubungi ${escapeHtml(ADMIN_CONTACT_HANDLE)}.</p>
<p>Happy gifting! \u{1F496}</p>
`.trim();
}
