import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) {
      return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    }

    if (!perfil || perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 403 });
    }

    if (perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ hasError: false, notification: null });
    }

    const { data: notif, error: notifErr } = await admin
      .from("notificaciones")
      .select("id_notificacion, id_usuario, tipo, mensaje, leido, estado, fecha_notificacion")
      .eq("id_usuario", perfil.id_usuario)
      .eq("tipo", "ERROR_RESUMEN_TAREAS")
      .eq("leido", false)
      .eq("estado", "ACTIVO")
      .order("fecha_notificacion", { ascending: false })
      .maybeSingle();

    if (notifErr) {
      return NextResponse.json({ error: notifErr.message }, { status: 500 });
    }

    return NextResponse.json({
      hasError: !!notif,
      notification: notif ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}