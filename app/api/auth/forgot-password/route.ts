import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import {
  getTempAccessEmailHTML,
  getTempAccessEmailText,
} from "@/lib/emails/tempAccessEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateTempPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();


    const { data: userData, error: userError } =
      await admin.auth.admin.listUsers();

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    const user = userData.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: "No existe una cuenta con ese correo" },
        { status: 404 }
      );
    }


    const { error: updateError } =
      await admin.auth.admin.updateUserById(user.id, {
        password: tempPassword,
      });

    if (updateError) {
      return NextResponse.json(
        { error: "No se pudo generar acceso temporal" },
        { status: 500 }
      );
    }

    await admin
      .from("usuarios")
      .update({
        force_password_change: true,
        temp_password: true,
      })
      .eq("auth_user_id", user.id);

    
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth`;

    const { error: emailError } = await resend.emails.send({
      from: "Sandía con Chile <noreply@thegreatestdev.org>",
      to: email,
      subject: "Acceso temporal a tu cuenta – SandíaShake",
      html: getTempAccessEmailHTML({
        userName: user.user_metadata?.nombre ?? "Hola",
        tempPassword,
        loginUrl,
      }),
      text: getTempAccessEmailText({
        userName: user.user_metadata?.nombre ?? "Hola",
        tempPassword,
        loginUrl,
      }),
    });

    if (emailError) {
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
