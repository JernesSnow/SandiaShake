import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil, error } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado, admin_nivel")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!perfil) {
      return NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      );
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, perfil }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
