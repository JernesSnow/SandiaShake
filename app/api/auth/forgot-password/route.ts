import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateTempPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 1. Get user from Auth
    const { data: userData, error: userError } =
      await admin.auth.admin.listUsers();

    const user = userData.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: "No existe una cuenta con ese correo" },
        { status: 404 }
      );
    }

    // 2. Generate temp password
    const temp_password = generateTempPassword();

    // 3. Update Auth password
    const { error: updateError } =
      await admin.auth.admin.updateUserById(user.id, {
        password: temp_password,
      });

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "No se pudo generar acceso temporal" },
        { status: 500 }
      );
    }

    // 4. Force password change in your DB
    await admin
      .from("usuarios")
      .update({ force_password_change: true })
      .eq("auth_user_id", user.id);

    const { error: emailError } = await resend.emails.send({
      from: "Sandía con Chile <noreply@thegreatestdev.org>",
      to: email,
      subject: "Acceso temporal a tu cuenta – Sandía con Chile",
      html: `
        <div style="font-family:Arial;background:#1a1a1d;padding:24px;color:#fff">
          <h2>Acceso temporal</h2>
          <p>Generamos una contraseña temporal para que ingreses:</p>

          <div style="font-size:18px;font-weight:bold;background:#262425;padding:12px;border-radius:6px">
            ${temp_password}
          </div>

          <p style="margin-top:16px">
            Inicia sesión y el sistema te pedirá cambiarla inmediatamente.
          </p>

          <a href="http://localhost:3000/auth"
             style="display:inline-block;margin-top:12px;background:#6cbe45;color:#000;padding:10px 16px;border-radius:6px;text-decoration:none">
            Iniciar sesión
          </a>
        </div>
      `,
    });

    if (emailError) {
      console.error(emailError);
      return NextResponse.json(
        { error: "Error enviando correo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
