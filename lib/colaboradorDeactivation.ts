import { SupabaseClient } from "@supabase/supabase-js";

// Tareas in these statuses are still in-flight and need a live owner;
// aprobada/archivada tareas are already closed out and don't get reassigned.
const REASSIGNABLE_STATUS = ["pendiente", "en_progreso", "en_revision"];

/**
 * When a colaborador is deactivated they must stop being tied to any
 * organización and stop owning in-flight tareas there — otherwise they'd
 * keep showing up as the assignee on work they can no longer see or act on.
 *
 * - Soft-deletes all of their asignacion_organizacion rows.
 * - Reassigns their in-flight tareas per org to another colaborador still
 *   assigned to that org (round-robin), if one exists. If none remain
 *   assigned, the tareas fall back to whichever admin created them (via
 *   the factura that generated them), same as at tarea-creation time.
 */
export async function unassignColaboradorFromOrganizaciones(
  admin: SupabaseClient,
  idColaborador: number,
  actorId: number
) {
  const { data: asignaciones } = await admin
    .from("asignacion_organizacion")
    .select("id_asignacion, id_organizacion")
    .eq("id_colaborador", idColaborador)
    .eq("estado", "ACTIVO");

  const orgIds = (asignaciones ?? []).map((a) => Number(a.id_organizacion));
  if (orgIds.length === 0) return;

  const now = new Date().toISOString();

  await admin
    .from("asignacion_organizacion")
    .update({ estado: "ELIMINADO", updated_by: actorId, updated_at: now })
    .in(
      "id_asignacion",
      (asignaciones ?? []).map((a) => a.id_asignacion)
    );

  for (const idOrganizacion of orgIds) {
    const { data: restantes } = await admin
      .from("asignacion_organizacion")
      .select("id_colaborador, usuarios!fk_asignacion_clientes_colaborador(estado)")
      .eq("id_organizacion", idOrganizacion)
      .eq("estado", "ACTIVO")
      .neq("id_colaborador", idColaborador);

    // Only hand tareas off to colaboradores who are themselves still active
    // — a stale assignment row shouldn't make an inactive user a candidate.
    const nuevosIds = Array.from(
      new Set(
        (restantes ?? [])
          .filter((r: any) => r.usuarios?.estado === "ACTIVO")
          .map((r) => Number(r.id_colaborador))
      )
    );

    const { data: tareas } = await admin
      .from("tareas")
      .select("id_tarea, created_by")
      .eq("id_organizacion", idOrganizacion)
      .eq("id_colaborador", idColaborador)
      .eq("estado", "ACTIVO")
      .in("status_kanban", REASSIGNABLE_STATUS);

    for (let i = 0; i < (tareas ?? []).length; i++) {
      const tarea = tareas![i];
      // No active colaborador left on the org — fall back to whichever
      // admin created the tarea (via the factura), instead of leaving it
      // pointing at a deactivated colaborador.
      const nuevoColaborador =
        nuevosIds.length > 0 ? nuevosIds[i % nuevosIds.length] : tarea.created_by;

      if (!nuevoColaborador) continue;

      await admin
        .from("tareas")
        .update({ id_colaborador: nuevoColaborador, updated_by: actorId, updated_at: now })
        .eq("id_tarea", tarea.id_tarea);
    }
  }
}
