import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/set-password";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Link inválido`);
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Invite expirado o inválido")}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
