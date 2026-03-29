import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (authErr || !user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "ADMIN") {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  }
  return { perfil };
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = now.toISOString().slice(0, 10);

    // Run all queries in parallel
    const [
      tareasRes,
      entregablesRes,
      organizacionesRes,
      colaboradoresRes,
      bienestarRes,
      chilliGanadosRes,
      chilliCanjeadosRes,
    ] = await Promise.all([
      admin.from("tareas").select("id_tarea, status_kanban, fecha_entrega, id_colaborador").eq("estado", "ACTIVO"),
      admin.from("entregables").select("id_entregable, estado_aprobacion, created_at").eq("estado", "ACTIVO"),
      admin.from("organizaciones").select("id_organizacion").eq("estado", "ACTIVO"),
      admin.from("usuarios").select("id_usuario, nombre, correo").eq("rol", "COLABORADOR").eq("estado", "ACTIVO"),
      // latest bienestar per user
      admin.from("usuario_bienestar").select("id_usuario, estado_animo, fecha_revision").eq("estado", "ACTIVO").order("fecha_revision", { ascending: false }),
      admin.from("chilli_movimientos").select("id_colaborador, puntos").eq("estado", "ACTIVO"),
      admin.from("canje_premio").select("id_colaborador, puntos_usados").neq("estado", "ELIMINADO"),
    ]);

    const tareas = tareasRes.data ?? [];
    const entregables = entregablesRes.data ?? [];
    const organizaciones = organizacionesRes.data ?? [];
    const colaboradores = colaboradoresRes.data ?? [];
    const bienestar = bienestarRes.data ?? [];
    const chilliGanados = chilliGanadosRes.data ?? [];
    const chilliCanjeados = chilliCanjeadosRes.data ?? [];

    /* ── KPIs ── */
    const tareasActivas = tareas.filter(
      (t) => !["aprobada", "rechazada", "archivada"].includes(t.status_kanban)
    ).length;

    const entregablesEstaSemana = entregables.filter(
      (e) => e.created_at >= weekAgo
    ).length;

    const clientesActivos = organizaciones.length;
    const colaboradoresActivos = colaboradores.length;

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

    /* ── EntregablesChart ── */
    const entregablesAprobados = entregables.filter((e) => e.estado_aprobacion === "APROBADO").length;
    const entregablesPendientes = entregables.filter((e) => e.estado_aprobacion === "PENDIENTE").length;
    const entregablesRechazados = entregables.filter((e) => e.estado_aprobacion === "RECHAZADO").length;

    /* ── SaludMental — latest record per user ── */
    const latestBienestar = new Map<number, string>();
    for (const b of bienestar) {
      if (!latestBienestar.has(b.id_usuario)) {
        latestBienestar.set(b.id_usuario, b.estado_animo);
      }
    }
    const bienestarCounts = { estable: 0, atento: 0, enRiesgo: 0, sinRegistro: 0 };
    for (const colab of colaboradores) {
      const estado = latestBienestar.get(colab.id_usuario);
      if (estado === "ESTABLE") bienestarCounts.estable++;
      else if (estado === "ATENTO") bienestarCounts.atento++;
      else if (estado === "EN_RIESGO") bienestarCounts.enRiesgo++;
      else bienestarCounts.sinRegistro++;
    }

    /* ── Rendimiento — completion % per collaborator ── */
    const tareasMap = new Map<number, { total: number; aprobadas: number }>();
    for (const t of tareas) {
      const id = Number(t.id_colaborador);
      if (!tareasMap.has(id)) tareasMap.set(id, { total: 0, aprobadas: 0 });
      const s = tareasMap.get(id)!;
      s.total++;
      if (t.status_kanban === "aprobada") s.aprobadas++;
    }

    const rendimiento = colaboradores
      .map((c) => {
        const stats = tareasMap.get(c.id_usuario) ?? { total: 0, aprobadas: 0 };
        const score = stats.total > 0 ? Math.round((stats.aprobadas / stats.total) * 100) : 0;
        return { nombre: c.nombre, score };
      })
      .sort((a, b) => b.score - a.score);

    /* ── ChilliPoints ── */
    let totalGanados = 0;
    for (const m of chilliGanados) totalGanados += Number(m.puntos);

    let totalCanjeados = 0;
    for (const c of chilliCanjeados) totalCanjeados += Number(c.puntos_usados);

    return NextResponse.json({
      kpis: {
        tareasActivas,
        entregablesEstaSemana,
        clientesActivos,
        colaboradoresActivos,
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
      saludMental: bienestarCounts,
      rendimiento,
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
