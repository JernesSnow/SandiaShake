import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: perfil } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { data, error: qErr } = await admin
      .from("chilli_movimientos")
      .select("id_movimiento, puntos, motivo, fecha, created_by")
      .eq("id_colaborador", perfil.id_usuario)
      .in("tipo", ["OTORGAR", "ELIMINAR"])
      .eq("estado", "ACTIVO")
      .order("fecha", { ascending: false });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const adminIds = Array.from(
      new Set((data ?? []).map((m) => m.created_by).filter((v): v is number => !!v))
    );

    const adminNames = new Map<number, string>();

    if (adminIds.length) {
      const { data: admins } = await admin
        .from("usuarios")
        .select("id_usuario, nombre")
        .in("id_usuario", adminIds);

      for (const a of admins ?? []) adminNames.set(a.id_usuario, a.nombre);
    }

    const ajustes = (data ?? []).map((m) => ({
      id_movimiento: m.id_movimiento,
      puntos: m.puntos,
      motivo: m.motivo,
      fecha: m.fecha,
      admin_nombre: adminNames.get(m.created_by) ?? "Admin",
    }));

    return NextResponse.json({ ajustes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
