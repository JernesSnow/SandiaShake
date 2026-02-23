// app/api/admin/tareas/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
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

async function getOrgIdsAsignadas(admin: any, idUsuario: number) {
  const { data, error } = await admin
    .from("asignacion_organizacion")
    .select("id_organizacion")
    .eq("id_colaborador", idUsuario)
    .eq("estado", "ACTIVO");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((r: any) => Number(r.id_organizacion))
    .filter((n: any) => Number.isFinite(n));
}

async function getOrgIdsCliente(admin: any, idUsuario: number) {
  const { data, error } = await admin
    .from("organizacion_usuario")
    .select("id_organizacion")
    .eq("id_usuario_cliente", idUsuario)
    .eq("estado", "ACTIVO");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((r: any) => Number(r.id_organizacion))
    .filter((n: any) => Number.isFinite(n));
}

async function attachColaboradores(admin: any, rows: any[]) {
  const ids = Array.from(
    new Set(
      (rows ?? [])
        .map((r: any) => r.id_colaborador)
        .filter(Boolean)
        .map(Number)
    )
  );

  if (ids.length === 0) return rows ?? [];

  const { data: users } = await admin
    .from("usuarios")
    .select("id_usuario,nombre")
    .in("id_usuario", ids);

  const map = new Map<number, any>();
  for (const u of users ?? []) map.set(Number(u.id_usuario), u);

  return (rows ?? []).map((r: any) => {
    const u = map.get(Number(r.id_colaborador));
    return { ...r, colaborador: u ? { nombre: u.nombre } : null };
  });
}

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

export async function GET(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const url = new URL(req.url);
    const idOrgParam = url.searchParams.get("id_organizacion");
    const idOrg = idOrgParam ? Number(idOrgParam) : null;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();
    const userId = Number(perfil!.id_usuario);

    // ADMIN
    if (rol === "ADMIN") {
      let q = admin
        .from("tareas")
        .select(selectWithJoins)
        .neq("estado", "ELIMINADO");

      if (idOrg && Number.isFinite(idOrg)) q = q.eq("id_organizacion", idOrg);

      const { data, error: qErr } = await q.order("created_at", { ascending: false });
      if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

      const withNames = await attachColaboradores(admin, data ?? []);
      return NextResponse.json({ ok: true, data: withNames }, { status: 200 });
    }

    if (rol === "CLIENTE") {
      const orgIds = await getOrgIdsCliente(admin, userId);

      if (idOrg && Number.isFinite(idOrg) && !orgIds.includes(idOrg)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }

      if (orgIds.length === 0) {
        return NextResponse.json({ ok: true, data: [] }, { status: 200 });
      }

      let q = admin
        .from("tareas")
        .select(selectWithJoins)
        .in("id_organizacion", orgIds)
        .neq("estado", "ELIMINADO");

      if (idOrg && Number.isFinite(idOrg)) q = q.eq("id_organizacion", idOrg);

      const { data, error: qErr } = await q.order("created_at", { ascending: false });
      if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

      const withNames = await attachColaboradores(admin, data ?? []);
      return NextResponse.json({ ok: true, data: withNames }, { status: 200 });
    }

    const orgIds = await getOrgIdsAsignadas(admin, userId);

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

    q = q.eq("id_colaborador", userId);

    const { data, error: qErr } = await q.order("created_at", { ascending: false });
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    const withNames = await attachColaboradores(admin, data ?? []);
    return NextResponse.json({ ok: true, data: withNames }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const rol = String(perfil!.rol ?? "").toUpperCase();
    const userId = Number(perfil!.id_usuario);

    if (rol === "CLIENTE") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const idOrganizacion = Number(body?.id_organizacion);
    const titulo = String(body?.titulo ?? "").trim();

    const descripcion = String(body?.descripcion ?? "");
    const status = String(body?.status_kanban ?? "pendiente").toLowerCase();
    const prioridad = String(body?.prioridad ?? "Media");
    const tipo = String(body?.tipo_entregable ?? "Otro");
    const fechaEntrega = body?.fecha_entrega ?? null;
    const mes = body?.mes ?? null;

    if (!idOrganizacion || !Number.isFinite(idOrganizacion)) {
      return NextResponse.json({ error: "id_organizacion inválido" }, { status: 400 });
    }
    if (!titulo) {
      return NextResponse.json({ error: "Título es obligatorio" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    let idColaboradorFinal = userId;

    if (rol === "COLABORADOR") {
      const orgIds = await getOrgIdsAsignadas(admin, userId);
      if (!orgIds.includes(idOrganizacion)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
      idColaboradorFinal = userId;
    } else if (rol === "ADMIN") {
      if (body?.id_colaborador !== undefined && body?.id_colaborador !== null && String(body.id_colaborador).trim() !== "") {
        const col = Number(body.id_colaborador);
        if (!col || !Number.isFinite(col)) {
          return NextResponse.json({ error: "id_colaborador inválido" }, { status: 400 });
        }
        idColaboradorFinal = col;
      } else {
        idColaboradorFinal = userId;
      }
    } else {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { data: inserted, error: insErr } = await admin
      .from("tareas")
      .insert({
        id_organizacion: idOrganizacion,
        id_colaborador: idColaboradorFinal,
        titulo,
        descripcion,
        status_kanban: status,
        prioridad,
        tipo_entregable: tipo,
        fecha_entrega: fechaEntrega,
        mes,
        estado: "ACTIVO",
        created_by: userId,
        updated_by: userId,
      })
      .select("id_tarea")
      .maybeSingle();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "No se pudo crear la tarea" },
        { status: 500 }
      );
    }

    const { data: row, error: qErr } = await admin
      .from("tareas")
      .select(selectWithJoins)
      .eq("id_tarea", inserted.id_tarea)
      .maybeSingle();

    if (qErr || !row) {
      return NextResponse.json(
        { error: qErr?.message ?? "Error consultando la tarea creada" },
        { status: 500 }
      );
    }

    const { data: u } = await admin
      .from("usuarios")
      .select("id_usuario,nombre")
      .eq("id_usuario", row.id_colaborador)
      .maybeSingle();

    const finalRow = { ...row, colaborador: u ? { nombre: u.nombre } : null };

    return NextResponse.json({ ok: true, data: finalRow }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}