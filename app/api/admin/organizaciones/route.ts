import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function GET() {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("organizaciones")
      .select(`
        id_organizacion,
        nombre,
        estado,
        created_at,
        pais,
        ciudad,
        canton,
        telefono,
        correo,
        descripcion
      `)
      .neq("estado", "ELIMINADO")
      .in("id_organizacion", perfil.allowedOrgIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}