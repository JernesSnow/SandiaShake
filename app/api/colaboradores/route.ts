// app/api/colaboradores/route.ts
// Read-only list of active colaboradores — accessible to ADMIN and COLABORADOR roles.

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: perfil } = await admin
      .from("usuarios")
      .select("rol, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!perfil || perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const rol = String(perfil.rol ?? "").toUpperCase();
    if (rol !== "ADMIN" && rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("usuarios")
      .select("id_usuario, nombre")
      .eq("rol", "COLABORADOR")
      .eq("estado", "ACTIVO")
      .order("nombre");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ colaboradores: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
