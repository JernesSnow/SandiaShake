import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No auth", 401);

  const { data: u } = await admin
    .from("usuarios")
    .select("id_usuario, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!u) return jsonError("Usuario no encontrado", 404);
  if (u.rol !== "CLIENTE") return jsonError("Solo CLIENTE", 403);

  const { data: ou } = await admin
    .from("organizacion_usuario")
    .select("id_organizacion, organizaciones(nombre)")
    .eq("id_usuario_cliente", u.id_usuario)
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (!ou?.id_organizacion) {
    return NextResponse.json({ organizacion: null, facturas: [] });
  }

  const url = new URL(req.url);
  const filtro = (url.searchParams.get("filtro") ?? "todas").toLowerCase();

  // Traer facturas (puedes ordenar por vencimiento o created_at si lo tienes)
  let q = admin
    .from("facturas")
    .select("id_factura, periodo, total, saldo, estado_factura, fecha_vencimiento, created_at")
    .eq("id_organizacion", ou.id_organizacion)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false });

  // Filtros
  if (filtro === "pendientes") {
    q = q.neq("estado_factura", "PAGADA").gt("saldo", 0);
  } else if (filtro === "pagadas") {
    q = q.eq("estado_factura", "PAGADA");
  }

  const { data: facturas, error } = await q;
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    organizacion: {
      id_organizacion: ou.id_organizacion,
      nombre: (ou as any).organizaciones?.nombre ?? null,
    },
    facturas: facturas ?? [],
  });
}
