import { NextResponse } from "next/server";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET() {
  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json({ error: "No hay tokens de OAuth." }, { status: 401 });
  }

  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name)",
      pageSize: 50,
      orderBy: "name",
    });

    return NextResponse.json({ folders: res.data.files ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}
