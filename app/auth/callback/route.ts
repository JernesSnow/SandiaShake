import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=Link inválido`);
  }

  const supabase = await createSupabaseServer();

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent("Link expirado o inválido")}`
    );
  }

  // Verify session was created successfully
  if (!data.session) {
    console.error("No session created after code exchange");
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent("Error al crear sesión")}`
    );
  }

  // Force a new response to ensure cookies are set
  const redirectUrl = new URL(next, origin);
  return NextResponse.redirect(redirectUrl);
}
