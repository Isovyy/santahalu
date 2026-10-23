import type { NotifyRow } from "@/lib/notify";
import { escapeHtml, ADMIN_CONTACT_HANDLE } from "@/lib/emailHtml";

export const FOLDER_EMAIL_SUBJECT = "SANTAHALU26 FINAL MATCH & START!!!";

export function folderEmailHtml(row: NotifyRow, submitUrl: string): string {
  // "Romantic - HL": the receiver's relationship type plus their yumeship
  // type, when they gave one (Platonic ships and older registrations don't).
  const yumeType = row.receiverYumeTypeReceive
    ? `${row.receiverRelationshipType} - ${row.receiverYumeTypeReceive}`
    : row.receiverRelationshipType;
  const admin = escapeHtml(ADMIN_CONTACT_HANDLE);

  return `
<p>Hello ${escapeHtml(row.giverTwt)},<br>
Pembuatan hadiah dapat dimulai.</p>

<p>Sebagai rekap, inilah penerima hadiah anda untuk SantaHalu26!</p>
<p>Receiver's details:<br>
&bull; Fandom: ${escapeHtml(row.receiverFandomYume)}<br>
&bull; Oshi: ${escapeHtml(row.receiverOshiName)}<br>
&bull; Yume Type: ${escapeHtml(yumeType)}<br>
&bull; Languages: ${escapeHtml(row.receiverLanguageReceive)}<br>
&bull; Docs: <a href="${escapeHtml(row.receiverYumeDocuLink)}">${escapeHtml(row.receiverYumeDocuLink)}</a></p>
<p>Jika sudah selesai, mohon upload karya ke dalam google drive:<br>
<a href="${escapeHtml(row.receiverFolderLink)}">${escapeHtml(row.receiverFolderLink)}</a></p>
<p>Jika sudah upload hadiah mohon confirm di link ini:<br>
<a href="${escapeHtml(submitUrl)}">${escapeHtml(submitUrl)}</a></p>
<p>CATATAN! Google drive hanya bisa di akses oleh email yang kalian daftarkan!!!</p>
<p>Penerima bersifat final dan tidak akan lagi dilakukan reshuffle. Jika ada kesalahan pada
link/akses drive, atau jika ada kesalahan pada info penerima mohon DM ${admin}</p>
<p>Hal-hal yang harus diingat:<br>
1. Jika mengganti username atau email, mohon kontak ${admin}<br>
2. Jika menghadapi kendala hingga tidak bisa memenuhi kewajiban memberi hadiah, mohon kontak ${admin}<br>
3. Jika ada yang perlu ditanyakan ke penerima, mohon kontak ${admin}<br>
4. Kegagalan dalam memenuhi kewajiban memberi hadiah TERMASUK tidak memenuhi minimum hadiah tanpa kabar akan di-block oleh yumefess,
di-blacklist dari event-event selanjutnya, dan @ kalian akan dipajang di @mlytfess</p>
<p>Sebagai referensi berikut adalah timeline dari event SantaHalu25:<br>
Timeline:<br>
10 Oktober: Pendaftaran<br>
17 - 24 Oktober: Sorting<br>
25 Oktober - 15 Desember: Pengerjaan Hadiah<br>
16 - 22 Desember: Sorting Hadiah<br>
23-24 Desember: Pengiriman Hadiah<br>
25 Desember: Posting bersama dengan tag #SantaHalu26</p>
<p>Jika ada pertanyaan atau perkara silahkan menghubungi ${admin}.</p>
<p>Happy gifting! \u{1F496}</p>
`.trim();
}
