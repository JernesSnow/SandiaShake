import { NextRequest, NextResponse } from "next/server";
import oauth2Client, { saveTokensToSupabase } from "@/lib/google-drive/auth";

export async function GET(req: NextRequest) {
  // Google redirects here with ?code=...&scope=...
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect("http://localhost:3000/configuracion?drive=error");
  }

  if (!code) {
    return NextResponse.redirect("http://localhost:3000/configuracion?drive=error");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Persist tokens to Supabase so they survive server restarts
    await saveTokensToSupabase(tokens);
  } catch (err) {
    return NextResponse.redirect("http://localhost:3000/configuracion?drive=error");
  }

  return NextResponse.redirect("http://localhost:3000/configuracion?drive=connected");
}
