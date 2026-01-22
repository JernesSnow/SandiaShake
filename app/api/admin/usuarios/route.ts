import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userErr || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN" || perfil.estado !== "ACTIVO") {return NextResponse.json({ error: "Sin permisos" }, { status: 403 });}


    const admin = createSupabaseAdmin();
    const { data: usuarios, error } = await admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, rol, admin_nivel, estado, created_at")
      .order("id_usuario", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ usuarios: usuarios ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
