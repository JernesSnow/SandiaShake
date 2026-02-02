import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, admin_nivel, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };

  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id_organizacion = Number(searchParams.get("id_organizacion"));

    if (!Number.isFinite(id_organizacion) || id_organizacion <= 0) {
      return NextResponse.json({ error: "id_organizacion inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Facturas de esa organización
    const { data: facturas, error: fErr } = await admin
      .from("facturas")
      .select("id_factura, periodo, total, saldo, estado_factura, fecha_vencimiento, estado, created_at")
      .eq("id_organizacion", id_organizacion)
      .eq("estado", "ACTIVO")
      .order("created_at", { ascending: false });

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

    const facturaIds = (facturas ?? []).map((f: any) => f.id_factura).filter(Boolean);

    // Pagos asociados a esas facturas
    const { data: pagos, error: pErr } = facturaIds.length
      ? await admin
          .from("pagos")
          .select("id_pago, id_factura, monto, metodo, referencia, fecha_pago, estado_pago, estado, created_at")
          .in("id_factura", facturaIds)
          .eq("estado", "ACTIVO")
          .order("fecha_pago", { ascending: false })
      : { data: [], error: null };

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        id_organizacion,
        facturas: facturas ?? [],
        pagos: pagos ?? [],
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
