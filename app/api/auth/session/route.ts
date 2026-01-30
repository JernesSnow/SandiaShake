import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const { data: perfil } = await admin
    .from("usuarios")
    .select("rol, force_password_change, temp_password")
    .eq("auth_user_id", user.id)
    .single();

  if (!perfil) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    rol: perfil.rol,
    force_password_change: perfil.force_password_change,
    temp_password: perfil.temp_password,
  });
}
