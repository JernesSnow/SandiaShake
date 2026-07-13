// app/api/admin/tareas/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ---------- HELPERS ---------- */

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
  const { data } = await admin
    .from("asignacion_organizacion")
    .select("id_organizacion")
    .eq("id_colaborador", idUsuario)
    .eq("estado", "ACTIVO");

  return (data ?? []).map((r: any) => Number(r.id_organizacion));
}

async function getOrgIdsCliente(admin: any, idUsuario: number) {
  const { data } = await admin
    .from("organizacion_usuario")
    .select("id_organizacion")
    .eq("id_usuario_cliente", idUsuario)
    .eq("estado", "ACTIVO");

  return (data ?? []).map((r: any) => Number(r.id_organizacion));
}

async function attachColaboradores(admin: any, rows: any[]) {
  const ids = Array.from(
    new Set((rows ?? []).map((r: any) => r.id_colaborador).filter(Boolean))
  );

  if (!ids.length) return rows ?? [];

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

/* ---------- SELECT WITH DRIVE FOLDER ---------- */

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

  organizaciones:organizaciones(nombre),

  google_drive_task_folders(
    folder_url
  )
`;

function attachDriveFolder(rows: any[]) {
  return (rows ?? []).map((r: any) => ({
    ...r,
    drive_folder_url: r.google_drive_task_folders?.[0]?.folder_url ?? null,
  }));
}

/* ---------- GET TAREAS ---------- */

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

    let q = admin
      .from("tareas")
      .select(selectWithJoins);

    if (rol === "ADMIN") {
      // Admins also get ELIMINADO tasks so the Kanban can render the
      // "Eliminadas" trash column; every other role only ever sees ACTIVO tasks.
      if (idOrg && Number.isFinite(idOrg)) q = q.eq("id_organizacion", idOrg);
    } else {
      q = q.neq("estado", "ELIMINADO");
    }

    if (rol === "CLIENTE") {
      const orgIds = await getOrgIdsCliente(admin, userId);

      if (!orgIds.length) {
        return NextResponse.json({ ok: true, data: [] });
      }

      q = q.in("id_organizacion", orgIds);

      if (idOrg && Number.isFinite(idOrg)) {
        if (!orgIds.includes(idOrg)) {
          return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }
        q = q.eq("id_organizacion", idOrg);
      }
    }

    if (rol === "COLABORADOR") {
      const orgIds = await getOrgIdsAsignadas(admin, userId);

      if (!orgIds.length) {
        return NextResponse.json({ ok: true, data: [] });
      }

      q = q
        .in("id_organizacion", orgIds)
        .eq("id_colaborador", userId);

      if (idOrg && Number.isFinite(idOrg)) {
        if (!orgIds.includes(idOrg)) {
          return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }
        q = q.eq("id_organizacion", idOrg);
      }
    }

    const { data, error: qErr } = await q.order("created_at", { ascending: false });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const withNames = await attachColaboradores(admin, data ?? []);
    const withDrive = attachDriveFolder(withNames);

    // Tareas rechazadas al menos una vez por el cliente (mismo criterio que
    // /api/cliente/dashboard: no hay status_kanban persistente para
    // "rechazada", así que se cuenta por el comentario de rechazo del cliente).
    const taskIds = (data ?? []).map((t: any) => t.id_tarea);
    let tareasRechazadas = 0;

    if (taskIds.length > 0) {
      const { data: rechazos } = await admin
        .from("tarea_comentarios")
        .select("id_tarea")
        .in("id_tarea", taskIds)
        .eq("tipo_comentario", "RECHAZO")
        .eq("tipo_autor", "CLIENTE")
        .eq("estado", "ACTIVO");

      tareasRechazadas = new Set((rechazos ?? []).map((r: any) => r.id_tarea)).size;
    }

    return NextResponse.json({ ok: true, data: withDrive, tareasRechazadas });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ---------- CREATE TAREA ----------
   Las tareas ya no se crean manualmente: se generan automáticamente
   al emitir una factura (ver app/api/admin/facturas/route.ts). */

export async function POST() {
  return NextResponse.json(
    { error: "Las tareas se generan automáticamente al emitir una factura" },
    { status: 405 }
  );
}