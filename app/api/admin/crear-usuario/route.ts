import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import {
  getAccessProvisioningEmailHTML,
  getAccessProvisioningEmailText,
} from "@/lib/emails/accessProvisioningEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateTempPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No auth" }, { status: 401 });
    }


    const { data: perfil, error: perfilErr } = await admin
      .from("usuarios")
      .select("rol, admin_nivel, id_usuario, estado")
      .eq("auth_user_id", user.id)
      .single();

    if (
      perfilErr ||
      !perfil ||
      perfil.rol !== "ADMIN" ||
      perfil.estado !== "ACTIVO"
    ) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }


    const { nombre, correo, rol, admin_nivel } = await req.json();

    if (!nombre || !correo || !rol) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

 
    const tempPassword = generateTempPassword();

  
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: correo,
        password: tempPassword,
        email_confirm: true, //confima el email en supabase al crear el usuario para evitar chocar con el OTP
      });

    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Error creando usuario" },
        { status: 500 }
      );
    }


    const { error: insertErr } = await admin.from("usuarios").insert({
      nombre,
      correo,
      rol,
      admin_nivel: rol === "ADMIN" ? admin_nivel ?? "SECUNDARIO" : null,
      estado: "ACTIVO",
      auth_user_id: created.user.id,
      force_password_change: true,
      temp_password: true,
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }


    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth`;

    await resend.emails.send({
      from: "Sandía con Chile <noreply@thegreatestdev.org>",
      to: correo,
      subject: "Acceso a tu cuenta – SandíaShake",
      html: getAccessProvisioningEmailHTML({
        userName: nombre,
        tempPassword,
        loginUrl,
      }),
      text: getAccessProvisioningEmailText({
        userName: nombre,
        tempPassword,
        loginUrl,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
