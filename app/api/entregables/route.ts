import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* =========================================================
   AUTH / PERFIL
========================================================= */
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

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
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

/* =========================================================
   HELPERS
========================================================= */
function parseMesAnio(mesRaw: any) {
  // You currently store tareas.mes as character varying.
  // We try to parse common formats. If it fails, fallback to current UTC month/year.

  const now = new Date();
  const fallback = { mes: now.getUTCMonth() + 1, anio: now.getUTCFullYear() };

  if (!mesRaw || typeof mesRaw !== "string") return fallback;

  const s = mesRaw.trim();

  // Format: "YYYY-MM" or "YYYY/MM"
  const m1 = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m1) {
    const anio = Number(m1[1]);
    const mes = Number(m1[2]);
    if (anio >= 2000 && mes >= 1 && mes <= 12) return { mes, anio };
    return fallback;
  }

  // Format: "YYYY-MM-DD" or "YYYY/MM/DD" -> use month/year portion
  const m2 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m2) {
    const anio = Number(m2[1]);
    const mes = Number(m2[2]);
    if (anio >= 2000 && mes >= 1 && mes <= 12) return { mes, anio };
    return fallback;
  }

  // Spanish month names like "Febrero 2026"
  const months: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    setiembre: 9,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  const parts = s.toLowerCase().replace(/\s+/g, " ").split(" ");
  if (parts.length >= 2) {
    const maybeMonth = parts[0];
    const maybeYear = parts[1];
    const mes = months[maybeMonth];
    const anio = Number(maybeYear);
    if (mes && anio >= 2000) return { mes, anio };
  }

  return fallback;
}

async function userHasOrgAccess(admin: any, idUsuario: number, idOrg: number) {
  const { data, error } = await admin
    .from("asignacion_organizacion")
    .select("id_asignacion")
    .eq("id_colaborador", idUsuario)
    .eq("id_organizacion", idOrg)
    .eq("estado", "ACTIVO")
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}

/* =========================================================
   POST /api/entregables
   Creates an entregable and (optionally) consumes 1 unit from the active monthly plan
========================================================= */
export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();

    const body = await req.json();

    // Required
    const id_tarea = Number(body?.id_tarea);
    const drive_folder_url = String(body?.drive_folder_url ?? "");
    const version_num = Number(body?.version_num ?? 1);

    // Optional metadata
    const drive_file_id = body?.drive_file_id ? String(body.drive_file_id) : null;
    const drive_file_name = body?.drive_file_name ? String(body.drive_file_name) : null;
    const drive_mime_type = body?.drive_mime_type ? String(body.drive_mime_type) : null;
    const drive_file_size =
      body?.drive_file_size !== undefined && body?.drive_file_size !== null
        ? Number(body.drive_file_size)
        : null;

    // Business flag (counts against plan)
    const cuenta_en_plan = Boolean(body?.cuenta_en_plan);

    if (!Number.isFinite(id_tarea) || id_tarea <= 0) {
      return NextResponse.json({ error: "id_tarea inválido" }, { status: 400 });
    }
    if (!drive_folder_url) {
      return NextResponse.json(
        { error: "drive_folder_url es requerido" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(version_num) || version_num <= 0) {
      return NextResponse.json(
        { error: "version_num inválido" },
        { status: 400 }
      );
    }

    // 1) Load task (we need org + mes)
    const { data: tarea, error: tErr } = await admin
      .from("tareas")
      .select("id_tarea,id_organizacion,id_colaborador,mes,estado")
      .eq("id_tarea", id_tarea)
      .maybeSingle();

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    if (!tarea || tarea.estado === "ELIMINADO") {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // 2) Permission check
    // - ADMIN can do anything
    // - COLABORADOR must be assigned to org OR be the task collaborator
    if (rol !== "ADMIN") {
      const idUsuario = Number(perfil!.id_usuario);
      const isOwner = Number(tarea.id_colaborador) === idUsuario;
      const hasAccess = await userHasOrgAccess(admin, idUsuario, Number(tarea.id_organizacion));
      if (!isOwner && !hasAccess) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // 3) If counts in plan, find active plan for that org + month/year and consume
    let id_org_plan: number | null = null;

    if (cuenta_en_plan) {
      const { mes, anio } = parseMesAnio(tarea.mes);

      const { data: plan, error: pErr } = await admin
        .from("organizacion_plan_contenido")
        .select("id_org_plan")
        .eq("id_organizacion", tarea.id_organizacion)
        .eq("mes", mes)
        .eq("anio", anio)
        .eq("estado", "ACTIVO")
        .maybeSingle();

      if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
      }

      if (!plan) {
        return NextResponse.json(
          { error: "No hay plan de contenido ACTIVO para este mes" },
          { status: 400 }
        );
      }

      // Consume 1 entregable safely (RPC returns boolean)
      const { data: okConsume, error: rpcErr } = await admin.rpc(
        "usar_entregable_plan",
        { p_id_org_plan: plan.id_org_plan }
      );

      if (rpcErr) {
        return NextResponse.json({ error: rpcErr.message }, { status: 500 });
      }

      if (!okConsume) {
        return NextResponse.json(
          { error: "No quedan entregables disponibles en el plan" },
          { status: 400 }
        );
      }

      id_org_plan = Number(plan.id_org_plan);
    }

    // 4) Insert entregable
    const payload: any = {
      id_tarea,
      version_num,
      drive_folder_url,
      creado_por: perfil!.id_usuario,
      cuenta_en_plan,
      id_org_plan,

      drive_file_id,
      drive_file_name,
      drive_mime_type,
      drive_file_size,
    };

    const { data: inserted, error: iErr } = await admin
      .from("entregables")
      .insert(payload)
      .select("*")
      .single();

    if (iErr) {
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: inserted }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
