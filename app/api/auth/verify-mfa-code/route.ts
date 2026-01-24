import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Find valid code for this user
    const { data: codeRecord, error: fetchError } = await admin
      .from("mfa_email_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching MFA code:", fetchError);
      return NextResponse.json(
        { error: "Error al verificar código" },
        { status: 500 }
      );
    }

    // Check if code exists and is valid
    if (!codeRecord) {
      // Increment failed attempts for active codes
      const { data: activeCodes } = await admin
        .from("mfa_email_codes")
        .select("id, attempts")
        .eq("user_id", user.id)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCodes) {
        await admin
          .from("mfa_email_codes")
          .update({ attempts: (activeCodes.attempts || 0) + 1 })
          .eq("id", activeCodes.id);
      }

      return NextResponse.json(
        { error: "Código incorrecto o expirado" },
        { status: 400 }
      );
    }

    // Check max attempts (prevent brute force)
    if (codeRecord.attempts >= 5) {
      return NextResponse.json(
        { error: "Demasiados intentos. Solicita un nuevo código." },
        { status: 429 }
      );
    }

    // Mark code as used
    await admin
      .from("mfa_email_codes")
      .update({ used: true })
      .eq("id", codeRecord.id);

    // Get user profile
    const { data: perfil } = await admin
      .from("usuarios")
      .select("rol, estado")
      .eq("auth_user_id", user.id)
      .single();

    if (!perfil || perfil.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      rol: perfil.rol,
      message: "Verificación exitosa",
    });
  } catch (error: any) {
    console.error("Verify MFA code error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
