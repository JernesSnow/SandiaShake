import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
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

    if (!perfil || perfil.estado !== "ACTIVO" || (perfil.rol !== "ADMIN" && perfil.rol !== "COLABORADOR")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();

    // A colaborador can only redeem for themself — only an admin may
    // redeem on behalf of someone else.
    const id_colaborador =
      perfil.rol === "COLABORADOR" ? perfil.id_usuario : Number(body.id_colaborador);
    const id_premio = Number(body.id_premio);

    if (!id_colaborador || !id_premio) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    /* GET PREMIO */

    const { data: premio, error: premioErr } = await admin
      .from("premios")
      .select("id_premio,puntos_costo")
      .eq("id_premio", id_premio)
      .single();

    if (premioErr || !premio) {
      return NextResponse.json(
        { error: "Premio no encontrado" },
        { status: 404 }
      );
    }

    /* VERIFY BALANCE — never trust the client's "can afford" check */

    const [{ data: ganados }, { data: canjeados }] = await Promise.all([
      admin.from("chilli_movimientos").select("puntos").eq("estado", "ACTIVO").eq("id_colaborador", id_colaborador),
      admin.from("canje_premio").select("puntos_usados").neq("estado", "ELIMINADO").eq("id_colaborador", id_colaborador),
    ]);

    const totalGanados = (ganados ?? []).reduce((sum, m) => sum + Number(m.puntos), 0);
    const totalCanjeados = (canjeados ?? []).reduce((sum, c) => sum + Number(c.puntos_usados), 0);
    const disponibles = totalGanados - totalCanjeados;

    if (disponibles < premio.puntos_costo) {
      return NextResponse.json(
        { error: "No tenés suficientes Chilli Points para este premio" },
        { status: 400 }
      );
    }

    /* INSERT CANJE */

    const { error: insertErr } = await admin
      .from("canje_premio")
      .insert({
        id_colaborador,
        id_premio,
        puntos_usados: premio.puntos_costo,
        estado: "ACTIVO",
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
