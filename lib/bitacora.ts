import { SupabaseClient } from "@supabase/supabase-js";

export type BitacoraAccion = "CREATE" | "UPDATE" | "DELETE" | "SOFT_DELETE";

export async function logBitacora(
  admin: SupabaseClient,
  {
    id_usuario,
    tabla_afectada,
    id_registro,
    accion,
    datos_antes,
    datos_despues,
  }: {
    id_usuario: number | null;
    tabla_afectada: string;
    id_registro?: number | null;
    accion: BitacoraAccion;
    datos_antes?: object | null;
    datos_despues?: object | null;
  }
) {
  try {
    await admin.from("bitacora_acciones").insert({
      id_usuario,
      tabla_afectada,
      id_registro: id_registro ?? null,
      accion,
      datos_antes: datos_antes ? JSON.stringify(datos_antes) : null,
      datos_despues: datos_despues ? JSON.stringify(datos_despues) : null,
      created_by: id_usuario,
      updated_by: id_usuario,
    });
  } catch (err) {
    console.error("[bitacora] failed to log:", err);
  }
}
