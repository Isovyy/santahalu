import type { NotifyRow } from "@/lib/notify";
import { escapeHtml } from "@/lib/emailHtml";

export const GIFT_EMAIL_SUBJECT = "SantaHalu26: Hadiahmu sudah sampai!";

export const POST_EVENT_ANNOUNCEMENT_URL = "https://x.com/mlytfess/postsantahalu26";

// Sent to the receiver (not the giver), pointing at their own Drive folder
// where their giver uploaded the gift.
export function giftEmailHtml(row: NotifyRow): string {
  const folder = escapeHtml(row.receiverFolderLink);
  const announcement = escapeHtml(POST_EVENT_ANNOUNCEMENT_URL);

  return `
<p>Hello ${escapeHtml(row.receiverTwt)},</p>
<p>A gift has been delivered to you!</p>
<p><a href="${folder}">${folder}</a></p>
<p>Terimakasih banyak atas partisipasinya dalam event SantaHalu26 dan terimakasih sudah menunggu!</p>
<p>Hadiahmu dapat dibuka lewat link di atas.</p>
<p>Mohon perhatikan juga pengumuman di link berikut.<br>
Event selanjutnya bersifat opsional, silakan ikut meramaikan:</p>
<p><a href="${announcement}">${announcement}</a></p>
<p>Merry Christmas and Happy New Year for you and your yumeship</p>
`.trim();
}
