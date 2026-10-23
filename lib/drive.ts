import { google } from "googleapis";

let auth: InstanceType<typeof google.auth.JWT> | null = null;

// The key gets mangled in different ways depending on where it was pasted
// (.env vs the Vercel dashboard): surrounding quotes, literal "\n" instead of
// line breaks, both at once, "\r\n". Any of those makes OpenSSL fail with
// "DECODER routines::unsupported". Rebuild a clean PEM from just the base64
// body so the paste format stops mattering.
function normalizePrivateKey(raw: string): string {
  const text = raw.trim().replace(/^["']|["']$/g, "").replace(/\\r|\\n/g, "\n");
  const match = text.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tidak valid: harus berisi -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY----- dari file JSON service account.",
    );
  }
  const [, label, body] = match;
  const base64 = body.replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set. Add both to .env before creating folders.",
    );
  }
  if (!auth) {
    auth = new google.auth.JWT({
      email,
      key: normalizePrivateKey(key),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }
  return auth;
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

// Creates a subfolder inside the shared parent folder (GOOGLE_DRIVE_PARENT_FOLDER_ID)
// and returns its shareable view link. The parent must already be shared with the
// service account (Editor access) so the folder lands inside the real owner's Drive.
export async function createDriveFolder(name: string): Promise<string> {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!parentId) {
    throw new Error("GOOGLE_DRIVE_PARENT_FOLDER_ID is not set. Add it to .env before creating folders.");
  }

  const res = await getDrive().files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, webViewLink",
    // Needed when the parent folder lives in a Shared Drive (service accounts
    // have no storage of their own, so a Shared Drive is the reliable home
    // for these folders). Harmless for a regular My Drive folder.
    supportsAllDrives: true,
  });

  if (!res.data.webViewLink) {
    throw new Error("Drive folder created without a webViewLink");
  }
  return res.data.webViewLink;
}

// Moves a folder the app created to the trash (recoverable for ~30 days from
// the service account's Drive). A folder that's already gone is fine.
export async function trashDriveFolder(folderLink: string): Promise<void> {
  const fileId = folderIdFromLink(folderLink);
  try {
    await getDrive().files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 404) return;
    throw err;
  }
}

// Folder links are stored as webViewLinks (".../drive/folders/<id>?usp=..."),
// the permissions API wants the bare id.
function folderIdFromLink(link: string): string {
  const id = link.match(/\/folders\/([\w-]+)/)?.[1];
  if (!id) throw new Error(`Bukan link folder Google Drive: ${link}`);
  return id;
}

// Gives `email` editor access to the folder. Silent by default — the folder
// email we send already carries the link, so Google's own "shared with you"
// mail would just be noise. Google refuses a silent share to an address with
// no Google account, so that one case falls back to letting Google notify
// them (the notification is how a non-Google address gets in at all).
export async function shareFolder(folderLink: string, email: string): Promise<void> {
  const fileId = folderIdFromLink(folderLink);
  const requestBody = { type: "user", role: "writer", emailAddress: email };
  try {
    await getDrive().permissions.create({
      fileId,
      requestBody,
      sendNotificationEmail: false,
      supportsAllDrives: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/notif/i.test(message)) throw err;
    await getDrive().permissions.create({
      fileId,
      requestBody,
      sendNotificationEmail: true,
      supportsAllDrives: true,
    });
  }
}

// Removes whatever access `email` has on the folder (no-op if none). Never
// touches the owner.
export async function unshareFolder(folderLink: string, email: string): Promise<void> {
  const fileId = folderIdFromLink(folderLink);
  const drive = getDrive();
  const res = await drive.permissions.list({
    fileId,
    fields: "permissions(id,emailAddress,role)",
    supportsAllDrives: true,
  });
  const target = email.trim().toLowerCase();
  for (const p of res.data.permissions ?? []) {
    if (p.role === "owner" || p.emailAddress?.toLowerCase() !== target || !p.id) continue;
    await drive.permissions.delete({ fileId, permissionId: p.id, supportsAllDrives: true });
  }
}
