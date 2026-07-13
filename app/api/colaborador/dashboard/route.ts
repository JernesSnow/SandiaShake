import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function requireColaborador() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (authErr || !user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "COLABORADOR") {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  }
  return { perfil };
}

export async function GET() {
  try {
    const { perfil, error } = await requireColaborador();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const userId = perfil!.id_usuario;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = now.toISOString().slice(0, 10);

    /* Scope everything to the orgs this colaborador is assigned to — same
       visibility model as the Kanban board, not company-wide like the admin
       dashboard. */
    const { data: misAsignaciones } = await admin
      .from("asignacion_organizacion")
      .select("id_organizacion")
      .eq("id_colaborador", userId)
      .eq("estado", "ACTIVO");

    const orgIds = Array.from(new Set((misAsignaciones ?? []).map((a) => Number(a.id_organizacion))));

    const saludMentalRes = await admin
      .from("usuario_bienestar")
      .select("estado_animo, puntaje, fecha_revision")
      .eq("id_usuario", userId)
      .order("fecha_revision", { ascending: false })
      .limit(1)
      .maybeSingle();

    const saludMental = saludMentalRes.data
      ? {
          estadoAnimo: saludMentalRes.data.estado_animo as "ESTABLE" | "ATENTO" | "EN_RIESGO",
          puntaje: saludMentalRes.data.puntaje,
          fechaRevision: saludMentalRes.data.fecha_revision,
        }
      : null;

    if (orgIds.length === 0) {
      return NextResponse.json({
        kpis: { tareasActivas: 0, entregablesEstaSemana: 0, organizacionesAsignadas: 0, companerosEquipo: 0 },
        tareasChart: { pendientes: 0, enProgreso: 0, enRevision: 0, atrasadas: 0 },
        entregablesChart: { aprobados: 0, pendientes: 0, rechazados: 0 },
        saludMental,
        chilliPoints: { totalGanados: 0, totalCanjeados: 0, disponibles: 0 },
      });
    }

    const [tareasRes, companerosRes, chilliGanadosRes, chilliCanjeadosRes] = await Promise.all([
      admin
        .from("tareas")
        .select("id_tarea, status_kanban, fecha_entrega, id_colaborador")
        .in("id_organizacion", orgIds)
        .eq("estado", "ACTIVO"),
      admin
        .from("asignacion_organizacion")
        .select("id_colaborador, usuarios!fk_asignacion_clientes_colaborador(id_usuario, nombre, estado)")
        .in("id_organizacion", orgIds)
        .eq("estado", "ACTIVO"),
      admin.from("chilli_movimientos").select("puntos").eq("estado", "ACTIVO").eq("id_colaborador", userId),
      admin.from("canje_premio").select("puntos_usados").neq("estado", "ELIMINADO").eq("id_colaborador", userId),
    ]);

    const tareas = tareasRes.data ?? [];
    const chilliGanados = chilliGanadosRes.data ?? [];
    const chilliCanjeados = chilliCanjeadosRes.data ?? [];

    /* ── KPIs ── */
    const tareasActivas = tareas.filter(
      (t) => !["aprobada", "rechazada", "archivada"].includes(t.status_kanban)
    ).length;

    // Entregables uploaded this week across these tareas.
    const tareaIds = tareas.map((t) => t.id_tarea);
    let entregablesEstaSemana = 0;
    if (tareaIds.length > 0) {
      const { data: entregables } = await admin
        .from("entregables")
        .select("id_entregable, created_at")
        .in("id_tarea", tareaIds)
        .eq("estado", "ACTIVO")
        .gte("created_at", weekAgo);
      entregablesEstaSemana = entregables?.length ?? 0;
    }

    /* ── teammates: other active colaboradores sharing at least one org ── */
    const companerosMap = new Map<number, { id_usuario: number; nombre: string }>();
    for (const a of companerosRes.data ?? []) {
      const u = (a as any).usuarios;
      if (!u || u.estado !== "ACTIVO" || Number(u.id_usuario) === Number(userId)) continue;
      companerosMap.set(Number(u.id_usuario), { id_usuario: u.id_usuario, nombre: u.nombre });
    }

    /* ── TareasChart ── */
    const tareasEnProgreso = tareas.filter((t) => t.status_kanban === "en_progreso").length;
    const tareasEnRevision = tareas.filter((t) => t.status_kanban === "en_revision").length;
    const tareasPendientes = tareas.filter((t) => t.status_kanban === "pendiente").length;
    const tareasAtrasadas = tareas.filter(
      (t) =>
        t.fecha_entrega &&
        t.fecha_entrega < today &&
        !["aprobada", "rechazada", "archivada"].includes(t.status_kanban)
    ).length;

    /* ── EntregablesChart (same convention as admin dashboard: derived
       from tarea status, not the entregables table directly) ── */
    const entregablesAprobados = tareas.filter((t) => t.status_kanban === "aprobada").length;
    const entregablesRechazados = tareas.filter((t) => t.status_kanban === "en_progreso").length;
    const entregablesPendientes = tareas.filter(
      (t) => t.status_kanban === "pendiente" || t.status_kanban === "en_revision"
    ).length;

    /* ── ChilliPoints — this colaborador only ── */
    let totalGanados = 0;
    for (const m of chilliGanados) totalGanados += Number(m.puntos);

    let totalCanjeados = 0;
    for (const c of chilliCanjeados) totalCanjeados += Number(c.puntos_usados);

    return NextResponse.json({
      kpis: {
        tareasActivas,
        entregablesEstaSemana,
        organizacionesAsignadas: orgIds.length,
        companerosEquipo: companerosMap.size,
      },
      tareasChart: {
        pendientes: tareasPendientes,
        enProgreso: tareasEnProgreso,
        enRevision: tareasEnRevision,
        atrasadas: tareasAtrasadas,
      },
      entregablesChart: {
        aprobados: entregablesAprobados,
        pendientes: entregablesPendientes,
        rechazados: entregablesRechazados,
      },
      saludMental,
      chilliPoints: {
        totalGanados,
        totalCanjeados,
        disponibles: totalGanados - totalCanjeados,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
