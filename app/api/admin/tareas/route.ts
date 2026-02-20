// app/api/admin/tareas/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ---------- HELPERS ---------- */

async function getPerfil() {
  // 1) Validar sesión con cookies del usuario (server client)
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

  // 2) ✅ Leer perfil con ADMIN para evitar RLS/permisos en "usuarios"
  const admin = createSupabaseAdmin();

  const { data: perfil, error } = await admin
    .from("usuarios")
    .select("rol, estado, id_usuario, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!perfil) {
    return {
      error: NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      ),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  return { perfil };
}

function normalizeStatus(v: any) {
  const s = String(v ?? "").toLowerCase();
  const allowed = new Set([
    "pendiente",
    "en_progreso",
    "en_revision",
    "aprobada",
    "archivada",
  ]);
  return allowed.has(s) ? s : "pendiente";
}

function normalizePrioridad(v: any) {
  const p = String(v ?? "").trim();
  const allowed = new Set(["Alta", "Media", "Baja"]);
  return allowed.has(p) ? p : "Media";
}

function normalizeTipoEntregable(v: any) {
  const t = String(v ?? "").trim();
  const allowed = new Set(["Arte", "Reel", "Copy", "Video", "Carrusel", "Otro"]);
  return allowed.has(t) ? t : "Otro"; // ✅ tu BD lo tiene NOT NULL
}

async function getOrgIdsAsignadas(admin: any, idUsuario: number) {
  const { data: asigs, error: asigErr } = await admin
    .from("asignacion_organizacion")
    .select("id_organizacion")
    .eq("id_colaborador", idUsuario)
    .eq("estado", "ACTIVO");

  if (asigErr) throw new Error(asigErr.message);

  return (asigs ?? [])
    .map((r: any) => Number(r.id_organizacion))
    .filter((n: any) => Number.isFinite(n));
}

/* ---------- GET ---------- */

export async function GET(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const url = new URL(req.url);
    const idOrgParam = url.searchParams.get("id_organizacion");
    const idOrg = idOrgParam ? Number(idOrgParam) : null;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();

    const selectWithJoins = `
      id_tarea,
      id_organizacion,
      id_colaborador,
      titulo,
      descripcion,
      status_kanban,
      prioridad,
      tipo_entregable,
      fecha_entrega,
      mes,
      estado,
      created_at,
      updated_at,
      organizaciones:organizaciones(nombre)
    `;

    // sin FK para traer nombre del colaborador → consulta aparte a usuarios
    async function attachColaboradores(rows: any[]) {
      const ids = Array.from(
        new Set(
          (rows ?? [])
            .map((r: any) => r.id_colaborador)
            .filter((v: any) => v !== null && v !== undefined)
            .map((v: any) => Number(v))
            .filter((n: any) => Number.isFinite(n))
        )
      );

      if (ids.length === 0) return rows ?? [];

      const { data: users, error: uErr } = await admin
        .from("usuarios")
        .select("id_usuario,nombre")
        .in("id_usuario", ids);

      if (uErr) return rows ?? [];

      const map = new Map<number, any>();
      for (const u of users ?? []) map.set(Number(u.id_usuario), u);

      return (rows ?? []).map((r: any) => {
        const u = map.get(Number(r.id_colaborador));
        return { ...r, colaborador: u ? { nombre: u.nombre } : null };
      });
    }

    // ✅ ADMIN ve todo (filtrable por organización)
    if (rol === "ADMIN") {
      let q = admin
        .from("tareas")
        .select(selectWithJoins)
        .neq("estado", "ELIMINADO");

      if (idOrg && Number.isFinite(idOrg)) q = q.eq("id_organizacion", idOrg);

      const { data, error: qErr } = await q.order("created_at", {
        ascending: false,
      });

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }

      const withNames = await attachColaboradores(data ?? []);
      return NextResponse.json({ ok: true, data: withNames }, { status: 200 });
    }

    // ✅ COLABORADOR: validar org asignadas + solo sus tareas
    const orgIds = await getOrgIdsAsignadas(admin, Number(perfil!.id_usuario));

    if (idOrg && Number.isFinite(idOrg) && !orgIds.includes(idOrg)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (!idOrg && orgIds.length === 0) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    let q = admin
      .from("tareas")
      .select(selectWithJoins)
      .neq("estado", "ELIMINADO");

    if (idOrg && Number.isFinite(idOrg)) q = q.eq("id_organizacion", idOrg);
    else q = q.in("id_organizacion", orgIds);

    // ✅ el colaborador solo ve SUS tareas
    q = q.eq("id_colaborador", Number(perfil!.id_usuario));

    const { data, error: qErr } = await q.order("created_at", {
      ascending: false,
    });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const withNames = await attachColaboradores(data ?? []);
    return NextResponse.json({ ok: true, data: withNames }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ---------- POST (crear tarea) ---------- */

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();

    const body = await req.json().catch(() => ({}));

    const titulo = String(body?.titulo ?? "").trim();
    const descripcion = String(body?.descripcion ?? "");
    const status_kanban = normalizeStatus(body?.status_kanban);
    const prioridad = normalizePrioridad(body?.prioridad);
    const tipo_entregable = normalizeTipoEntregable(body?.tipo_entregable);

    const fecha_entrega = String(body?.fecha_entrega ?? "").trim();
    const mes = String(body?.mes ?? "").trim();

    const id_organizacion =
      body?.id_organizacion !== undefined ? Number(body.id_organizacion) : NaN;

    if (!titulo) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }

    if (!Number.isFinite(id_organizacion) || id_organizacion <= 0) {
      return NextResponse.json(
        { error: "id_organizacion inválido" },
        { status: 400 }
      );
    }

    // ✅ Permisos:
    // - ADMIN: puede crear para cualquier org/colaborador
    // - COLABORADOR: solo si está asignado a esa organización y solo para sí mismo
    if (rol !== "ADMIN") {
      const orgIds = await getOrgIdsAsignadas(admin, Number(perfil!.id_usuario));
      if (!orgIds.includes(id_organizacion)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // ✅ id_colaborador es BIGINT en tu BD → usar number
    let finalColaborador: number;
    if (rol === "ADMIN") {
      const bodyColab =
        body?.id_colaborador !== undefined && body?.id_colaborador !== null
          ? Number(body.id_colaborador)
          : NaN;
      finalColaborador = Number.isFinite(bodyColab)
        ? bodyColab
        : Number(perfil!.id_usuario);
    } else {
      finalColaborador = Number(perfil!.id_usuario); // ignora body.id_colaborador
    }

    const { data: inserted, error: insErr } = await admin
      .from("tareas")
      .insert({
        id_organizacion,
        id_colaborador: finalColaborador,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        tipo_entregable, // ✅ NOT NULL y válido
        fecha_entrega: fecha_entrega ? fecha_entrega : null, // date
        mes: mes ? mes : null,
        estado: "ACTIVO",
      })
      .select(
        `
        id_tarea,
        id_organizacion,
        id_colaborador,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        tipo_entregable,
        fecha_entrega,
        mes,
        estado,
        created_at,
        updated_at,
        organizaciones:organizaciones(nombre)
      `
      )
      .maybeSingle();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    if (!inserted) {
      return NextResponse.json(
        { error: "No se pudo crear la tarea" },
        { status: 500 }
      );
    }

    const { data: u } = await admin
      .from("usuarios")
      .select("id_usuario,nombre")
      .eq("id_usuario", inserted.id_colaborador)
      .maybeSingle();

    const payload = {
      ...inserted,
      colaborador: u ? { nombre: u.nombre } : null,
    };

    return NextResponse.json({ ok: true, data: payload }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
