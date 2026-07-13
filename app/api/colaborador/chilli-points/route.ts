import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: perfil } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const [{ data: ganados }, { data: canjeados }] = await Promise.all([
      admin.from("chilli_movimientos").select("puntos").eq("estado", "ACTIVO").eq("id_colaborador", perfil.id_usuario),
      admin.from("canje_premio").select("puntos_usados").neq("estado", "ELIMINADO").eq("id_colaborador", perfil.id_usuario),
    ]);

    const totalGanados = (ganados ?? []).reduce((sum, m) => sum + Number(m.puntos), 0);
    const totalCanjeados = (canjeados ?? []).reduce((sum, c) => sum + Number(c.puntos_usados), 0);

    return NextResponse.json({
      chilliPoints: totalGanados - totalCanjeados,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
