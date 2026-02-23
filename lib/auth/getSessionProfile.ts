import { createSupabaseServer } from "@/lib/supabase/server";

type SessionProfile = {
  id_usuario: number;
  rol: "ADMIN" | "COLABORADOR" | "CLIENTE";
  estado: string;
  force_password_change: boolean | null;
  allowedOrgIds: number[];
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  try {
    const supabase = await createSupabaseServer();
    if (!supabase) return null;

    /* 1️⃣ Get Auth User */
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return null;

    /* 2️⃣ Get Profile */
    const { data: perfil, error } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado, force_password_change")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error || !perfil) return null;
    if (perfil.estado !== "ACTIVO") return null;

    let allowedOrgIds: number[] = [];

    /* =========================================================
       3️⃣ Load Allowed Organizations
    ========================================================= */

    if (perfil.rol === "CLIENTE") {
      const { data } = await supabase
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", perfil.id_usuario)
        .eq("estado", "ACTIVO");

      allowedOrgIds = data?.map(o => o.id_organizacion) ?? [];
    }

    if (perfil.rol === "COLABORADOR") {
      const { data } = await supabase
        .from("asignacion_organizacion")
        .select("id_organizacion")
        .eq("id_colaborador", perfil.id_usuario)
        .eq("estado", "ACTIVO");

      allowedOrgIds = data?.map(o => o.id_organizacion) ?? [];
    }

    if (perfil.rol === "ADMIN") {
      // Admin can access all orgs
      const { data } = await supabase
        .from("organizaciones")
        .select("id_organizacion")
        .eq("estado", "ACTIVO");

      allowedOrgIds = data?.map(o => o.id_organizacion) ?? [];
    }

    return {
      ...perfil,
      rol: perfil.rol as any,
      allowedOrgIds,
    };

  } catch (err) {
    console.error("Session profile error:", err);
    return null;
  }
}