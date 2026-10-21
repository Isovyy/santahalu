import type { NotifyRow } from "@/lib/notify";
import { escapeHtml, ADMIN_CONTACT_HANDLE } from "@/lib/emailHtml";

export const MATCH_EMAIL_SUBJECT = "RESHUFFLE #2: Your Santahalu26 Match!";

export function matchEmailHtml(row: NotifyRow, confirmUrl: string, extendUrl: string): string {
  return `
<p>Halo ${escapeHtml(row.giverTwt)},</p>
<p>Inilah penerima hadiah hasil reshuffle #2 anda untuk Santahalu! \u{1F381}</p>
<p><strong>Receiver's details:</strong></p>
<ul>
  <li>Fandom: ${escapeHtml(row.receiverFandomYume)}</li>
  <li>Oshi: ${escapeHtml(row.receiverOshiName)}</li>
  <li>Yume Type: ${escapeHtml(row.receiverRelationshipType)}</li>
  <li>Languages: ${escapeHtml(row.receiverLanguageReceive)}</li>
  <li>Docs: <a href="${escapeHtml(row.receiverYumeDocuLink)}">${escapeHtml(row.receiverYumeDocuLink)}</a></li>
</ul>
<p>Konfirmasi/request reshuffle di link ini: <a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
<p>Tolong pastikan juga docs kalian sendiri sudah terbuka!!</p>
<p>Mohon diperhatikan terutama fandom dan preferensi bahasa bagi para penulis, lalu
konfirmasi bila tidak ada masalah. Dihimbau untuk tidak membuat hadiah terlebih dahulu, karena
kami akan memberi waktu sampai tanggal 22 Oktober pk 15:00 WIB bagi semua peserta untuk konfirmasi ulang. Disini masih dapat
terjadi reshuffle pasangan bila ada yang melaporkan masalah, jadi mohon bersabar dan menunggu konfirmasi ulang dari pihak kami.</p>
<p>Bila ada kesalahan dari pihak kami (mendapat doubles/fandom tidak sesuai, dll) atau penerima dirasa kurang cocok mohon
langsung lapor melalui link di atas.</p>
<p>Jika ada pertanyaan atau perkara silahkan menghubungi @FATUIUWU (X) atau Minkou di discord channel. Untuk link discord silahkan cek @mlytfess (X).</p>
<p>Happy gifting! \u{1F496}</p>
`.trim();
}
