import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getMFACodeEmailHTML, getMFACodeEmailText } from "@/lib/emails/mfa-code-template";

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit code
function generateMFACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    // Get authenticated user - check both user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log("MFA Send Code - User:", user?.id, "Session:", session?.user?.id);
    console.log("User Error:", userError, "Session Error:", sessionError);

    if (!user || !session) {
      console.error("No user or session found");
      return NextResponse.json(
        { error: "No autenticado. Por favor inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: perfil } = await admin
      .from("usuarios")
      .select("nombre, correo")
      .eq("auth_user_id", user.id)
      .single();

    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // Invalidate any existing unused codes for this user
    await admin
      .from("mfa_email_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // Generate new code
    const code = generateMFACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const { error: insertError } = await admin
      .from("mfa_email_codes")
      .insert({
        user_id: user.id,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing MFA code:", insertError);
      return NextResponse.json(
        { error: "Error al generar código" },
        { status: 500 }
      );
    }

    // Send email with code
    console.log("Sending email to:", perfil.correo);

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('REPLACE_ME')) {
      console.error("RESEND_API_KEY not configured properly");
      return NextResponse.json(
        { error: "Servicio de email no configurado. Contacta al administrador." },
        { status: 500 }
      );
    }

    const { error: emailError } = await resend.emails.send({
      from: "SandíaShake <noreply@thegreatestdev.org>",
      to: perfil.correo,
      subject: `Tu código de verificación es ${code}`,
      html: getMFACodeEmailHTML(code, perfil.nombre),
      text: getMFACodeEmailText(code, perfil.nombre),
    });

    if (emailError) {
      console.error("Error sending MFA email:", emailError);
      return NextResponse.json(
        { error: `Error al enviar código: ${emailError.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

    console.log("MFA code sent successfully to:", perfil.correo);

    return NextResponse.json({
      success: true,
      message: "Código enviado a tu correo",
      expiresIn: 600, // seconds
    });
  } catch (error: any) {
    console.error("Send MFA code error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
