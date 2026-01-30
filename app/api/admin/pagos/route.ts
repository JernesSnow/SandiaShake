import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PostBody = {
  id_factura: number;
  monto: number;
  metodo: "SINPE" | "TRANSFERENCIA" | "OTRO";
  referencia?: string;
  fecha_pago?: string; 
};

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

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = (await req.json()) as PostBody;

    const id_factura = Number(body.id_factura);
    const monto = Number(body.monto);
    const metodo = body.metodo;
    const referencia = String(body.referencia ?? "").trim();
    const fecha_pago = body.fecha_pago
      ? new Date(body.fecha_pago).toISOString()
      : new Date().toISOString();

    if (!Number.isFinite(id_factura) || id_factura <= 0) {
      return NextResponse.json({ error: "id_factura inválido" }, { status: 400 });
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "monto inválido" }, { status: 400 });
    }
    if (!["SINPE", "TRANSFERENCIA", "OTRO"].includes(metodo)) {
      return NextResponse.json({ error: "metodo inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: factura, error: fErr } = await admin
      .from("facturas")
      .select("id_factura, id_organizacion, total, saldo, estado_factura")
      .eq("id_factura", id_factura)
      .maybeSingle();

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    if (!factura) return NextResponse.json({ error: "Factura no existe" }, { status: 404 });

    const saldoActual = Number(factura.saldo ?? factura.total ?? 0);

    // Evitar que se realice un sobrepago
    if (monto > saldoActual) return NextResponse.json({ error: "El monto excede el saldo actual" }, { status: 400 });

    const nuevoSaldo = Math.max(0, saldoActual - monto);

    const nuevoEstadoFactura = nuevoSaldo === 0 ? "PAGADA" : "PARCIAL";

    const { data: pagoInsertado, error: pErr } = await admin
      .from("pagos")
      .insert({
        id_factura,
        monto,
        metodo,
        referencia: referencia || null,
        fecha_pago,
        estado_pago: "CONFIRMADO",
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      })
      .select("id_pago, id_factura, monto, metodo, referencia, fecha_pago, estado_pago")
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const { error: updFacturaErr } = await admin
      .from("facturas")
      .update({
        saldo: nuevoSaldo,
        estado_factura: nuevoEstadoFactura,
        updated_by: perfil!.id_usuario,
        updated_at: new Date().toISOString(),
      })
      .eq("id_factura", id_factura);

    if (updFacturaErr) {
      return NextResponse.json({ error: updFacturaErr.message }, { status: 500 });
    }

    const { error: estadoPagoErr } = await admin
      .from("estado_pago_organizacion")
      .upsert(
        {
          id_organizacion: factura.id_organizacion,
          estado_cuenta: "AL_DIA",
          dias_mora: 0,
          ultimo_pago: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id_organizacion" }
      );

    if (estadoPagoErr) {
      return NextResponse.json({ error: estadoPagoErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        pago: pagoInsertado,
        factura: {
          id_factura,
          saldo_anterior: saldoActual,
          saldo_nuevo: nuevoSaldo,
          estado_factura: nuevoEstadoFactura,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
