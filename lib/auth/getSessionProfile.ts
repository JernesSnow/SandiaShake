import { createSupabaseServer } from "@/lib/supabase/server";

type SessionProfile = {
  id_usuario: number;
  rol: string;
  estado: string;
  force_password_change: boolean | null;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  try {
    const supabase = await createSupabaseServer();

    if (!supabase) {
      return null;
    }

    /* =========================================================
       1️⃣ Get Auth User
    ========================================================= */
    const authResponse = await supabase.auth.getUser();

    if (!authResponse || !authResponse.data?.user) {
      return null;
    }

    const user = authResponse.data.user;

    /* =========================================================
       2️⃣ Get App Profile (usuarios table)
    ========================================================= */
    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado, force_password_change")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilError || !perfil) {
      return null;
    }

    /* =========================================================
       3️⃣ Validate Profile State
    ========================================================= */
    if (perfil.estado !== "ACTIVO") {
      return null;
    }

    return perfil as SessionProfile;

  } catch (err) {
    console.error("Session profile error:", err);
    return null;
  }
}