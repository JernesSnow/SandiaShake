import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Perfil = { id_usuario: number; rol: string; estado: string };

async function getPerfil() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();

  if (authErr) return { error: NextResponse.json({ error: authErr.message }, { status: 401 }) };
  const user = userData?.user;
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const admin = createSupabaseAdmin();
  const { data: perfil, error } = await admin
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle<Perfil>();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };

  return { perfil };
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function canAccessTask(admin: any, perfil: Perfil, idTarea: number) {
  const rol = String(perfil.rol ?? "").toUpperCase();
  const userId = Number(perfil.id_usuario);

  const { data: t, error: tErr } = await admin
    .from("tareas")
    .select("id_tarea,id_organizacion,id_colaborador,estado")
    .eq("id_tarea", idTarea)
    .maybeSingle();

  if (tErr) throw new Error(tErr.message);
  if (!t) return { ok: false, status: 404, message: "Tarea no existe" };
  if (String(t.estado ?? "").toUpperCase() === "ELIMINADO") {
    return { ok: false, status: 404, message: "Tarea no disponible" };
  }

  if (rol === "ADMIN") return { ok: true };

  if (rol === "COLABORADOR") {
    if (Number(t.id_colaborador) !== userId) {
      return { ok: false, status: 403, message: "Sin permisos" };
    }
    return { ok: true };
  }

  if (rol === "CLIENTE") {
    const orgId = Number(t.id_organizacion);
    const { data: link, error: oErr } = await admin
      .from("organizacion_usuario")
      .select("id_cliente_usuario")
      .eq("id_organizacion", orgId)
      .eq("id_usuario_cliente", userId)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (oErr) throw new Error(oErr.message);
    if (!link) return { ok: false, status: 403, message: "Sin permisos" };

    return { ok: true };
  }

  return { ok: false, status: 403, message: "Sin permisos" };
}
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeNum(id);
    if (!idTarea) {
      return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const access = await canAccessTask(admin, perfil!, idTarea);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const { data: comentarios, error: cErr } = await admin
      .from("tarea_comentarios")
      .select("id_comentario")
      .eq("id_tarea", idTarea)
      .eq("estado", "ACTIVO");

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const ids = (comentarios ?? [])
      .map((x: any) => Number(x.id_comentario))
      .filter((n: any) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, unread: 0, total: 0, read: 0 }, { status: 200 });
    }

    const { data: lecturas, error: lErr } = await admin
      .from("tarea_comentario_lecturas")
      .select("id_comentario")
      .eq("id_usuario", perfil!.id_usuario)
      .in("id_comentario", ids);

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    const readCount = (lecturas ?? []).length;
    const total = ids.length;
    const unread = Math.max(0, total - readCount);

    return NextResponse.json({ ok: true, unread, total, read: readCount }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}