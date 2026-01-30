import { createSupabaseServer } from "@/lib/supabase/server";

export async function getSessionProfile() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id_usuario, rol, estado, force_password_change")
    .eq("auth_user_id", user.id)
    .single();

  if (!perfil || perfil.estado !== "ACTIVO") return null;

  return perfil;
}
