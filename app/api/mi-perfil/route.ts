import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return jsonError(userErr.message, 401);
    if (!user) return jsonError("No session", 401);

    const { data: perfil, error } = await admin
      .from("usuarios")
      .select("nombre, correo")
      .eq("auth_user_id", user.id)
      .single();

    if (error) return jsonError(error.message, 500);
    if (!perfil) return jsonError("Perfil no encontrado", 404);

    return NextResponse.json({ nombre: perfil.nombre, correo: perfil.correo });
  } catch (e: any) {
    return jsonError(e?.message ?? "Error interno", 500);
  }
}

type PatchBody = {
  nombre?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("No auth", 401);

    const body = (await req.json()) as PatchBody;

    const nombre = (body.nombre ?? "").trim();
    const currentPassword = (body.currentPassword ?? "").trim();
    const newPassword = (body.newPassword ?? "").trim();
    const confirmPassword = (body.confirmPassword ?? "").trim();

    // Validaciones de formulario incompleto / inválido
    if (!nombre) {
      return jsonError("El nombre es obligatorio.", 400);
    }

    const wantsPasswordChange = !!newPassword || !!confirmPassword || !!currentPassword;

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return jsonError("Debes completar todos los campos de contraseña.", 400);
      }
      if (newPassword.length < 8) {
        return jsonError("La nueva contraseña debe tener al menos 8 caracteres.", 400);
      }
      if (newPassword !== confirmPassword) {
        return jsonError("La confirmación no coincide con la nueva contraseña.", 400);
      }
    }

    //  Actualizar NOMBRE (NO correo)
    const { error: updErr } = await admin
      .from("usuarios")
      .update({ nombre, updated_at: new Date().toISOString() })
      .eq("auth_user_id", user.id);

    if (updErr) return jsonError(updErr.message, 500);

    //  Cambiar CONTRASEÑA (Auth) 
    if (wantsPasswordChange) {
      // Validar contraseña actual: signInWithPassword con ANON KEY
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: signErr } = await anon.auth.signInWithPassword({
        email: user.email!, // viene del user de auth
        password: currentPassword,
      });

      if (signErr) {
        return jsonError("Contraseña actual incorrecta.", 400);
      }

      const { error: passErr } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (passErr) return jsonError(passErr.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Error interno del servidor", 500);
  }
}