import { NextRequest, NextResponse } from "next/server";
import oauth2Client, { saveTokensToSupabase } from "@/lib/google-drive/auth";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/configuracion?drive=error`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/configuracion?drive=error`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    await saveTokensToSupabase(tokens);
  } catch (err) {
    return NextResponse.redirect(`${BASE_URL}/configuracion?drive=error`);
  }

  return NextResponse.redirect(`${BASE_URL}/configuracion?drive=connected`);
}
