import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Perfil = {
  id_usuario: number;
  rol: string;
  estado: string;
  auth_user_id?: string;
};

function pickAutorNombre(autor: unknown): string {
  if (!autor) return "—";
  if (Array.isArray(autor)) return String((autor[0] as any)?.nombre ?? "—");
  return String((autor as any)?.nombre ?? "—");
}

async function getPerfil() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();

  if (authErr) {
    return {
      error: NextResponse.json({ error: authErr.message }, { status: 401 }),
    };
  }

  const user = userData?.user;
  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const admin = createSupabaseAdmin();

  const { data: perfil, error } = await admin
    .from("usuarios")
    .select("rol, estado, id_usuario, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<Perfil>();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  if (!perfil) {
    return {
      error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  return { perfil };
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function assertCanAccessTask(admin: any, perfil: Perfil, idTarea: number) {
  const rol = String(perfil.rol ?? "").toUpperCase();

  const { data: tarea, error: tErr } = await admin
    .from("tareas")
    .select("id_tarea,id_organizacion,id_colaborador,estado")
    .eq("id_tarea", idTarea)
    .maybeSingle();

  if (tErr) throw new Error(tErr.message);
  if (!tarea) {
    const err: any = new Error("Tarea no encontrada");
    err.status = 404;
    throw err;
  }

  if (String(tarea.estado ?? "").toUpperCase() === "ELIMINADO") {
    const err: any = new Error("Tarea no disponible");
    err.status = 404;
    throw err;
  }

  if (rol === "ADMIN") return tarea;

  if (rol === "COLABORADOR") {
    if (Number(tarea.id_colaborador) !== Number(perfil.id_usuario)) {
      const err: any = new Error("Sin permisos");
      err.status = 403;
      throw err;
    }
    return tarea;
  }

  if (rol === "CLIENTE") {
    const orgId = Number(tarea.id_organizacion);
    const userId = Number(perfil.id_usuario);

    const { data: link, error: lErr } = await admin
      .from("organizacion_usuario")
      .select("id_cliente_usuario")
      .eq("id_organizacion", orgId)
      .eq("id_usuario_cliente", userId)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (lErr) throw new Error(lErr.message);

    if (!link) {
      const err: any = new Error("Sin permisos");
      err.status = 403;
      throw err;
    }

    return tarea;
  }

  const err: any = new Error("Rol no autorizado");
  err.status = 403;
  throw err;
}

async function attachReadReceipts(admin: any, rows: any[]) {
  const ids = (rows ?? [])
    .map((r: any) => Number(r.id_comentario))
    .filter((n: any) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) return rows ?? [];

  const { data: lecturas, error: lErr } = await admin
    .from("tarea_comentario_lecturas")
    .select("id_comentario,id_usuario")
    .in("id_comentario", ids);

  if (lErr) throw new Error(lErr.message);

  const map = new Map<number, Set<number>>();
  for (const l of lecturas ?? []) {
    const idc = Number((l as any).id_comentario);
    const uid = Number((l as any).id_usuario);
    if (!Number.isFinite(idc) || !Number.isFinite(uid)) continue;

    if (!map.has(idc)) map.set(idc, new Set<number>());
    map.get(idc)!.add(uid);
  }

  return (rows ?? []).map((r: any) => {
    const idc = Number(r.id_comentario);
    const authorId = Number(r.id_usuario);
    const readers = map.get(idc) ?? new Set<number>();

    let countOthers = 0;
    for (const uid of readers) {
      if (uid !== authorId) countOthers++;
    }

    return {
      ...r,
      visto_por_otro: countOthers > 0,
      leido_por_count: countOthers,
    };
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeNum(id);
    if (!idTarea) {
      return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    try {
      await assertCanAccessTask(admin, perfil!, idTarea);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Sin permisos" },
        { status: e?.status ?? 403 }
      );
    }

    const { data, error: qErr } = await admin
      .from("tarea_comentarios")
      .select(
        `
        id_comentario,
        id_tarea,
        id_usuario,
        tipo_autor,
        comentario,
        created_at,
        autor:usuarios!fk_tarea_comentarios_usuario (
          id_usuario,
          nombre
        )
      `
      )
      .eq("id_tarea", idTarea)
      .eq("estado", "ACTIVO")
      .order("created_at", { ascending: true });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const mappedBase = rows.map((r: any) => ({
      id_comentario: r.id_comentario,
      id_tarea: r.id_tarea,
      id_usuario: r.id_usuario,
      tipo_autor: r.tipo_autor,
      comentario: r.comentario,
      created_at: r.created_at,
      autor_nombre: pickAutorNombre(r.autor),
    }));


    let mapped = mappedBase;
    try {
      mapped = await attachReadReceipts(admin, mappedBase);
    } catch {
      mapped = mappedBase.map((r: any) => ({
        ...r,
        visto_por_otro: false,
        leido_por_count: 0,
      }));
    }

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeNum(id);
    if (!idTarea) {
      return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const comentario = String(body?.comentario ?? "").trim();
    if (!comentario) {
      return NextResponse.json({ error: "Comentario es obligatorio" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    try {
      await assertCanAccessTask(admin, perfil!, idTarea);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Sin permisos" },
        { status: e?.status ?? 403 }
      );
    }

    const rol = String(perfil!.rol ?? "").toUpperCase();
    const tipo_autor = rol === "CLIENTE" ? "CLIENTE" : "COLABORADOR";

    const { data: created, error: insErr } = await admin
      .from("tarea_comentarios")
      .insert({
        id_tarea: idTarea,
        id_usuario: perfil!.id_usuario,
        tipo_autor,
        comentario,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      })
      .select(
        `
        id_comentario,
        id_tarea,
        id_usuario,
        tipo_autor,
        comentario,
        created_at,
        autor:usuarios!fk_tarea_comentarios_usuario (
          id_usuario,
          nombre
        )
      `
      )
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id_comentario: created.id_comentario,
          id_tarea: created.id_tarea,
          id_usuario: created.id_usuario,
          tipo_autor: created.tipo_autor,
          comentario: created.comentario,
          created_at: created.created_at,
          autor_nombre: pickAutorNombre((created as any).autor),
          visto_por_otro: false,
          leido_por_count: 0,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}