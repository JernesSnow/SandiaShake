import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (authErr) return { error: NextResponse.json({ error: authErr.message }, { status: 401 }) };
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios").select("rol, estado, id_usuario").eq("auth_user_id", user.id).maybeSingle();
  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Sin perfil" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 50;
    const offset = (page - 1) * limit;
    const tabla = url.searchParams.get("tabla") ?? null;
    const accion = url.searchParams.get("accion") ?? null;

    const admin = createSupabaseAdmin();

    let query = admin
      .from("bitacora_acciones")
      .select(
        `id_accion, id_usuario, tabla_afectada, id_registro, accion,
         datos_antes, datos_despues, fecha_accion,
         actor:usuarios!fk_bitacora_usuario ( nombre, correo, rol )`,
        { count: "exact" }
      )
      .eq("estado", "ACTIVO")
      .order("fecha_accion", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tabla) query = query.eq("tabla_afectada", tabla);
    if (accion) query = query.eq("accion", accion);

    const { data, count, error: qErr } = await query;
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({
      acciones: data ?? [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
