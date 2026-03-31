import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil } = await admin
      .from("usuarios")
      .select("id_usuario, rol")
      .eq("auth_user_id", user.id)
      .single();

    if (!perfil || perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ registrado: false, aplica: false });
    }

    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: entrada } = await admin
      .from("usuario_bienestar")
      .select("id_bienestar")
      .eq("id_usuario", perfil.id_usuario)
      .gte("fecha_revision", `${hoy}T00:00:00.000Z`)
      .lt("fecha_revision", `${hoy}T23:59:59.999Z`)
      .maybeSingle();

    return NextResponse.json({ registrado: !!entrada, aplica: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
