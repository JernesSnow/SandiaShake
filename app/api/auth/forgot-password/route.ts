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
      subject: "Acceso temporal a tu cuenta – SandíaShake",
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acceso temporal - SandíaShake</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="background-color: #2b2b30; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #6cbe45; margin: 0; font-size: 28px;">🍉 SandíaShake</h1>
        </div>

        <!-- Body -->
        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2b2b30; margin-top: 0;">Acceso temporal</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hemos generado una <strong>contraseña temporal</strong> para que puedas ingresar a tu cuenta de SandíaShake.
          </p>

          <!-- Password Box -->
          <div style="background-color: #f8f8f8; border: 2px dashed #6cbe45; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
            <div style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #2b2b30; font-family: 'Courier New', monospace;">
              ${temp_password}
            </div>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Al iniciar sesión, el sistema te pedirá <strong>cambiar esta contraseña inmediatamente</strong> por razones de seguridad.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/auth"
              style="display: inline-block; background-color: #6cbe45; color: #000; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Iniciar sesión
            </a>
          </div>

          <!-- Warning -->
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 13px;">
              <strong>⚠️ Seguridad:</strong> Esta contraseña es temporal y personal. No la compartas con nadie.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">SandíaShake - Sistema de Gestión</p>
          <p style="margin: 5px 0;">Este es un correo automático, por favor no respondas.</p>
        </div>

      </div>
    </body>
    </html>
      `.trim(),
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
