import { NextResponse } from "next/server";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET() {
  await ensureDriveCredentials();
  const connected = !!oauth2Client.credentials?.access_token;
  return NextResponse.json({ connected });
}
