import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {

    const supabase = await createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
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

    const url = new URL(req.url);
    const requested = Number(url.searchParams.get("id_colaborador"));

    // A colaborador can only view their own redemption history.
    const id_colaborador = perfil.rol === "COLABORADOR" ? perfil.id_usuario : requested;

    if (!Number.isFinite(id_colaborador)) {
      return NextResponse.json(
        { error: "id_colaborador requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("canje_premio")
      .select(`
        id_canje,
        id_premio,
        puntos_usados,
        fecha_canje,
        estado,
        premios (
          nombre
        )
      `)
      .eq("id_colaborador", id_colaborador)
      .order("fecha_canje", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const redenciones = (data ?? []).map((r: any) => ({
      id_canje: r.id_canje,
      id_premio: r.id_premio,
      premio_nombre: r.premios?.nombre ?? "Premio",
      puntos_usados: r.puntos_usados,
      fecha_canje: r.fecha_canje,
      estado: r.estado
    }));

    return NextResponse.json(
      { redenciones },
      { status: 200 }
    );

  } catch (e: any) {

    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );

  }
}