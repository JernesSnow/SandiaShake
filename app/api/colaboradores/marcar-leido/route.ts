import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
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

    const body = await req.json();
    const id_notificacion = Number(body?.id_notificacion);

    if (!Number.isFinite(id_notificacion)) {
      return NextResponse.json(
        { error: "id_notificacion inválido" },
        { status: 400 }
      );
    }

    const { data: updatedRows, error: updateErr } = await admin
      .from("notificaciones")
      .update({
        leido: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id_notificacion", id_notificacion)
      .eq("id_usuario", perfil.id_usuario)
      .eq("tipo", "ERROR_RESUMEN_TAREAS")
      .eq("estado", "ACTIVO")
      .select("id_notificacion, leido");

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "No se pudo marcar la notificación como leída" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      updated: updatedRows[0],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}