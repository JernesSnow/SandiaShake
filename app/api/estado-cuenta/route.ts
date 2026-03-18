import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";


function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const ymdCR = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const diffDaysCR = (fromYYYYMMDD: string, toYYYYMMDD: string) => {
  const from = new Date(fromYYYYMMDD + "T00:00:00-06:00");
  const to = new Date(toYYYYMMDD + "T00:00:00-06:00");
  const diffMs = from.getTime() - to.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

export async function GET() {
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

  // Solo bloqueamos clientes 
  if (u.rol !== "CLIENTE") {
    return NextResponse.json({ blocked: false });
  }

  // organizacion del cliente 
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

const todayStr = ymdCR(new Date());
const maxPreAvisoStr = ymdCR(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
const minAvisoStr = ymdCR(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));

const { data: facturasBanner, error: bannerErr } = await admin
  .from("facturas")
  .select("id_factura, periodo, saldo, fecha_vencimiento")
  .eq("id_organizacion", idOrg)
  .eq("estado", "ACTIVO")
  .gt("saldo", 0)
  .not("fecha_vencimiento", "is", null)
  .gte("fecha_vencimiento", minAvisoStr)
  .lte("fecha_vencimiento", maxPreAvisoStr)
  .order("fecha_vencimiento", { ascending: true });

if (bannerErr) return jsonError(bannerErr.message, 500);

  // Traer nombre real de la organización
const { data: org } = await admin
  .from("organizaciones")
  .select("nombre")
  .eq("id_organizacion", idOrg)
  .maybeSingle();

const nombreOrganizacion = org?.nombre ?? null;

const facturaBanner = (facturasBanner ?? [])[0] ?? null;

let banner = {
  show: false,
  type: "info" as "info" | "warning" | "danger",
  diasRestantes: null as number | null,
  fechaVencimiento: null as string | null,
  saldoPendiente: null as number | null,
  periodo: null as string | null,
  idFactura: null as number | null,
  mensaje: "",
};

if (facturaBanner?.fecha_vencimiento) {
  const vence = String(facturaBanner.fecha_vencimiento).slice(0, 10);
  const diasRestantes = diffDaysCR(vence, todayStr);

  if ([7, 3, 0, -1].includes(diasRestantes)) {
    let type: "info" | "warning" | "danger" = "info";
    let mensaje = "";

    if (diasRestantes === 7) {
      type = "info";
      mensaje = "Tu membresía vence en 7 días.";
    } else if (diasRestantes === 3) {
      type = "warning";
      mensaje = "Tu membresía vence en 3 días.";
    } else if (diasRestantes === 0) {
      type = "warning";
      mensaje = "Tu membresía vence hoy.";
    } else if (diasRestantes === -1) {
      type = "danger";
      mensaje = "Tu membresía está vencida.";
    }

    banner = {
      show: true,
      type,
      diasRestantes,
      fechaVencimiento: vence,
      saldoPendiente: Number(facturaBanner.saldo ?? 0),
      periodo: facturaBanner.periodo ?? null,
      idFactura: facturaBanner.id_factura ?? null,
      mensaje,
    };
  }
}
  // morosidad vencida + 2 días + saldo>0
  const cutoffBloqueo = ymdCR(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

const { data: facturasMorosas, error } = await admin
  .from("facturas")
  .select("id_factura, periodo, saldo, fecha_vencimiento")
  .eq("id_organizacion", idOrg)
  .eq("estado", "ACTIVO")
  .gt("saldo", 0)
  .not("fecha_vencimiento", "is", null)
  .lte("fecha_vencimiento", cutoffBloqueo);

  if (error) return jsonError(error.message, 500);

  const blocked = (facturasMorosas?.length ?? 0) > 0;

const pagoInfo = {
  sinpe: process.env.PAGO_SINPE ?? null,
  cuenta: process.env.PAGO_CUENTA ?? null,
  banco: process.env.PAGO_BANCO ?? null,
  titular: process.env.PAGO_TITULAR ?? null,
  emailComprobante: process.env.PAGO_EMAIL_COMPROBANTE ?? null,
};

  return NextResponse.json({
    blocked,
    id_organizacion: idOrg,
    organizacion_nombre: nombreOrganizacion,
    facturasMorosas: facturasMorosas ?? [],
    banner,
    pagoInfo,
  });
}