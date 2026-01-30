import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

type Body = {
  nombre: string;
  correo: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const nombre = (body.nombre ?? "").trim();
    const correo = (body.correo ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();

    // Validaciones básicas
    if (!nombre || !correo || !password) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return NextResponse.json(
        { error: "Correo electrónico inválido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // Evitar duplicado en public.usuarios
    const { data: existente } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("correo", correo)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        { error: "Este correo ya está registrado" },
        { status: 409 }
      );
    }

    // Usar signUp (NO admin API) para que Supabase envíe el email de verificación automáticamente
    // Este es el comportamiento para CLIENTE (usuarios), diferente de ADMIN/COLABORADOR que usan invites
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: correo,
      password: password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          nombre: nombre,
        },
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario" },
        { status: 500 }
      );
    }

    // Crear perfil en usuarios inmediatamente (usando admin para bypass RLS)
    const { error: insertErr } = await admin.from("usuarios").insert({
      nombre,
      correo,
      rol: "CLIENTE",
      admin_nivel: null,
      estado: "ACTIVO",
      auth_user_id: authUserId,
      created_by: null, // Auto-registro
      updated_by: null,
    });

    if (insertErr) {
      console.error("Error creating user profile:", insertErr);
      // Si falla la creación del perfil, eliminar el usuario de auth
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje: "Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta.",
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno del servidor" },
      { status: 500 }
    );
  }
}
