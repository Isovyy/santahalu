import { google } from "googleapis";

let auth: InstanceType<typeof google.auth.JWT> | null = null;

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
      // .env stores the key with literal "\n" sequences, restore real newlines.
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }
  return auth;
}

// Creates a subfolder inside the shared parent folder (GOOGLE_DRIVE_PARENT_FOLDER_ID)
// and returns its shareable view link. The parent must already be shared with the
// service account (Editor access) so the folder lands inside the real owner's Drive.
export async function createDriveFolder(name: string): Promise<string> {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!parentId) {
    throw new Error("GOOGLE_DRIVE_PARENT_FOLDER_ID is not set. Add it to .env before creating folders.");
  }

  const drive = google.drive({ version: "v3", auth: getAuth() });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, webViewLink",
  });

  if (!res.data.webViewLink) {
    throw new Error("Drive folder created without a webViewLink");
  }
  return res.data.webViewLink;
}
