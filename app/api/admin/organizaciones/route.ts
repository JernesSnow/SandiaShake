import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { ok: true };
}

export async function GET() {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const admin = createSupabaseAdmin();

    // ✅ NO PLAN LOGIC
    const { data, error: qErr } = await admin
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
      .neq("estado", "ELIMINADO");

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}