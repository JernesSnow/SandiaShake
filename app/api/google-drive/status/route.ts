import { NextResponse } from "next/server";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET() {
  await ensureDriveCredentials();

  const creds = oauth2Client.credentials;
  const hasToken = !!creds?.access_token;

  if (!hasToken) {
    return NextResponse.json({ connected: false, expired: false });
  }

  // Try a lightweight Drive call to verify the token actually works
  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    await drive.about.get({ fields: "user" });
    return NextResponse.json({ connected: true, expired: false });
  } catch (err: any) {
    const code = err?.code ?? err?.response?.status;
    if (code === 401 || code === 403 || err?.message?.includes("invalid_grant")) {
      return NextResponse.json({ connected: false, expired: true });
    }
    // Other errors (network, etc.) — assume connected but can't verify
    return NextResponse.json({ connected: true, expired: false });
  }
}
