import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function countDriveItems(folderId: string) {
  const ok = await ensureDriveCredentials();
  if (!ok) return 0;

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, mimeType)",
  });

  return res.data.files?.length ?? 0;
}
