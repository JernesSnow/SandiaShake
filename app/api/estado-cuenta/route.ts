import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("No auth", 401);

  // 1) usuario interno
  const { data: u } = await admin
    .from("usuarios")
    .select("id_usuario, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!u) return jsonError("Usuario no encontrado", 404);

  // Solo bloqueamos clientes (si querés)
  if (u.rol !== "CLIENTE") {
    return NextResponse.json({ blocked: false });
  }

  // 2) organizacion del cliente (1 a 1)
  const { data: ou } = await admin
    .from("organizacion_usuario")
    .select("id_organizacion")
    .eq("id_usuario_cliente", u.id_usuario)
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (!ou?.id_organizacion) {
    return NextResponse.json({ blocked: false });
  }

  const idOrg = ou.id_organizacion;

  // 3) morosidad: vencida + 2 días + saldo>0
  // (usamos admin para saltar RLS en server, ok)
  const { data: facturasMorosas, error } = await admin
    .from("facturas")
    .select("id_factura, saldo, fecha_vencimiento")
    .eq("id_organizacion", idOrg)
    .gt("saldo", 0)
    .not("fecha_vencimiento", "is", null)
    .lte("fecha_vencimiento", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)); // YYYY-MM-DD

  if (error) return jsonError(error.message, 500);

  const blocked = (facturasMorosas?.length ?? 0) > 0;

  // (Opcional) actualizar estado_pago_organizacion aquí

  return NextResponse.json({
    blocked,
    id_organizacion: idOrg,
    facturasMorosas: facturasMorosas ?? [],
  });
}