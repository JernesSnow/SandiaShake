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
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Perfil no configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const id_colaborador = Number(url.searchParams.get("id_colaborador"));
    if (!Number.isFinite(id_colaborador) || id_colaborador <= 0) {
      return NextResponse.json({ error: "id_colaborador es obligatorio" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Fetch all active tasks for this collaborator
    const { data: tareas, error: tareasErr } = await admin
      .from("tareas")
      .select("id_tarea, status_kanban, fecha_entrega, created_at, updated_at")
      .eq("id_colaborador", id_colaborador)
      .eq("estado", "ACTIVO");

    if (tareasErr) return NextResponse.json({ error: tareasErr.message }, { status: 500 });

    const tareaIds = (tareas ?? []).map((t) => t.id_tarea);

    // Fetch all entregables (versions) for those tasks
    let entregables: any[] = [];
    if (tareaIds.length > 0) {
      const { data: ents } = await admin
        .from("entregables")
        .select("id_entregable, id_tarea, version_num, created_at")
        .in("id_tarea", tareaIds)
        .eq("estado", "ACTIVO");
      entregables = ents ?? [];
    }

    // --- Basic task counts (all at tarea level) ---
    const totalTareas = (tareas ?? []).length;
    const tareasAprobadas = (tareas ?? []).filter((t) => t.status_kanban === "aprobada").length;
    const tareasRechazadas = (tareas ?? []).filter((t) => t.status_kanban === "rechazada").length;
    const tareasEnProgreso = (tareas ?? []).filter((t) => t.status_kanban === "en_progreso").length;
    const tareasEnRevision = (tareas ?? []).filter((t) => t.status_kanban === "en_revision").length;
    const tareasPendientes = (tareas ?? []).filter((t) => t.status_kanban === "pendiente").length;

    // --- Puntualidad ---
    // Was the first entregable submitted before or on the tarea's fecha_entrega?
    // This measures the collaborator's punctuality, not the client's response time.
    const versionesMap = new Map<number, number>(); // id_tarea -> earliest created_at (as ms)
    for (const e of entregables) {
      if (e.version_num === 1) {
        versionesMap.set(e.id_tarea, new Date(e.created_at).getTime());
      }
    }

    const tareasConFecha = (tareas ?? []).filter((t) => t.fecha_entrega);
    let tareasATiempo = 0;
    let tareasConRetraso = 0;

    for (const t of tareasConFecha) {
      const primerEnvio = versionesMap.get(t.id_tarea);
      if (primerEnvio == null) continue; // not yet submitted, skip
      const deadline = new Date(t.fecha_entrega);
      deadline.setHours(23, 59, 59, 999);
      if (primerEnvio <= deadline.getTime()) tareasATiempo++;
      else tareasConRetraso++;
    }

    const tareasEvaluadas = tareasATiempo + tareasConRetraso;
    const puntualidad = tareasEvaluadas > 0
      ? Math.round((tareasATiempo / tareasEvaluadas) * 100)
      : null;

    // --- Tiempo promedio de entrega ---
    // Days from tarea.created_at to first entregable submission (version_num = 1)
    let sumaDias = 0;
    let countTiempo = 0;
    for (const t of tareas ?? []) {
      const primerEnvio = versionesMap.get(t.id_tarea);
      if (primerEnvio == null) continue;
      const dias = (primerEnvio - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (dias >= 0) { sumaDias += dias; countTiempo++; }
    }
    const tiempoPromedioEntrega = countTiempo > 0
      ? Math.round((sumaDias / countTiempo) * 10) / 10
      : null;

    // --- Aprobación en 1ra versión (at tarea level) ---
    // Among approved tareas, how many had only 1 entregable version submitted?
    // A tarea approved with 1 version = client accepted the work on first try.
    const versionCountMap = new Map<number, number>(); // id_tarea -> max version_num
    for (const e of entregables) {
      const current = versionCountMap.get(e.id_tarea) ?? 0;
      if (e.version_num > current) versionCountMap.set(e.id_tarea, e.version_num);
    }

    const tareasAprobadasList = (tareas ?? []).filter((t) => t.status_kanban === "aprobada");
    const aprobadasPrimeraVersion = tareasAprobadasList.filter(
      (t) => (versionCountMap.get(t.id_tarea) ?? 0) === 1
    ).length;

    const tasaAprobacionPrimeraVersion = tareasAprobadas > 0
      ? Math.round((aprobadasPrimeraVersion / tareasAprobadas) * 100)
      : null;

    // --- Versiones promedio por tarea (revision rounds) ---
    // Lower = better. Measures how many rounds of revisions on average.
    const tareasConEntregables = Array.from(versionCountMap.values());
    const versionesPromedio = tareasConEntregables.length > 0
      ? Math.round((tareasConEntregables.reduce((a, b) => a + b, 0) / tareasConEntregables.length) * 10) / 10
      : null;

    // --- Monthly breakdown (last 6 months) ---
    const now = new Date();
    const meses: { label: string; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const label = d.toLocaleString("es-ES", { month: "short", year: "2-digit" });
      meses.push({ label, key });
    }

    const porMes = meses.map(({ label, key }) => ({
      mes: label,
      aprobadas: (tareas ?? []).filter(
        (t) => t.status_kanban === "aprobada" && t.updated_at.slice(0, 7) === key
      ).length,
      rechazadas: (tareas ?? []).filter(
        (t) => t.status_kanban === "rechazada" && t.updated_at.slice(0, 7) === key
      ).length,
      versiones: entregables.filter((e) => e.created_at.slice(0, 7) === key).length,
    }));

    return NextResponse.json({
      metricas: {
        totalTareas,
        tareasAprobadas,
        tareasRechazadas,
        tareasEnProgreso,
        tareasEnRevision,
        tareasPendientes,
        puntualidad,
        tareasATiempo,
        tareasConRetraso,
        tareasConFechaEntrega: tareasConFecha.length,
        tiempoPromedioEntrega,
        aprobadasPrimeraVersion,
        tasaAprobacionPrimeraVersion,
        versionesPromedio,
        porMes,
      },
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
