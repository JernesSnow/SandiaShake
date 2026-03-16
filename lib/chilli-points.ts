import { SupabaseClient } from "@supabase/supabase-js";

export async function grantChilliPointsIfNotExists(
  admin: SupabaseClient,
  {
    id_colaborador,
    puntos,
    motivo,
    id_tarea,
    id_entregable
  }: {
    id_colaborador: number;
    puntos: number;
    motivo: string;
    id_tarea?: number;
    id_entregable?: number;
  }
) {

  const { data: exists } = await admin
    .from("chilli_movimientos")
    .select("id_movimiento")
    .eq("id_colaborador", id_colaborador)
    .eq("motivo", motivo)
    .limit(1)
    .maybeSingle();

  if (exists) return false;

  const now = new Date().toISOString();

  const { error } = await admin
    .from("chilli_movimientos")
    .insert({
      id_colaborador,
      puntos,
      tipo: "AUTO",
      motivo,
      estado: "ACTIVO",
      fecha: now,
      created_at: now,
      updated_at: now,
      created_by: id_colaborador,
      updated_by: id_colaborador,
      id_tarea,
      id_entregable
    });

  if (error) {
    console.error("Chilli insert error:", error);
  }

  return true;
}