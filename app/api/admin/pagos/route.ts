import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import {
  getFacturaEmailHTML,
  getFacturaEmailText,
} from "@/lib/emails/factura-template";

type PostBody = {
  id_factura: number;
  monto: number;
  metodo: "SINPE" | "TRANSFERENCIA" | "OTRO";
  referencia?: string;
  fecha_pago?: string;
};

const resend = new Resend(process.env.RESEND_API_KEY);

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

    //  Traer factura base
    const { data: factura, error: fErr } = await admin
      .from("facturas")
      .select("id_factura, id_organizacion, total, saldo, estado_factura, estado, periodo, fecha_vencimiento")
      .eq("id_factura", id_factura)
      .maybeSingle();

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    if (!factura || factura.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Factura no existe o está eliminada" }, { status: 404 });
    }

    const saldoActual = Number(factura.saldo ?? factura.total ?? 0);
    if (monto > saldoActual) {
      return NextResponse.json({ error: "El monto excede el saldo actual" }, { status: 400 });
    }

    const nuevoSaldo = Math.max(0, saldoActual - monto);
    const nuevoEstadoFactura = nuevoSaldo === 0 ? "PAGADA" : "PARCIAL";

    //  Insertar pago
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

    // Actualizar factura
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

    //Estado cuenta organización
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

    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && !apiKey.includes("REPLACE_ME")) {
        //  Traer organización 
        const { data: org, error: orgErr } = await admin
          .from("organizaciones")
          .select("id_organizacion, nombre, estado")
          .eq("id_organizacion", factura.id_organizacion)
          .maybeSingle();

        if (!orgErr && org && org.estado === "ACTIVO") {
          const organizacionNombre = org.nombre ?? "—";

          // Buscar usuario cliente vinculado 
          const { data: orgUser, error: ouErr } = await admin
            .from("organizacion_usuario")
            .select("id_usuario_cliente, estado")
            .eq("id_organizacion", factura.id_organizacion)
            .eq("estado", "ACTIVO")
            .limit(1)
            .maybeSingle();

          if (!ouErr && orgUser?.id_usuario_cliente) {
            const { data: cliente, error: cErr } = await admin
              .from("usuarios")
              .select("id_usuario, nombre, correo, rol, estado")
              .eq("id_usuario", orgUser.id_usuario_cliente)
              .maybeSingle();

            if (
              !cErr &&
              cliente &&
              cliente.estado === "ACTIVO" &&
              cliente.rol === "CLIENTE" &&
              cliente.correo
            ) {
              // Detalles 
              const { data: detData } = await admin
                .from("factura_detalles")
                .select("id_factura, id_organizacion, total, saldo, estado_factura, estado, periodo, fecha_vencimiento")
                .eq("id_factura", factura.id_factura)
                .eq("estado", "ACTIVO")
                .order("orden", { ascending: true });

              const detalles = (detData ?? []).map((d: any) => ({
                concepto: d.concepto ?? "",
                descripcion: d.nota ?? null,
                categoria: d.tipo ?? "OTRO",
                cantidad: Number(d.cantidad ?? 0),
                precio_unitario: Number(d.precio_unitario ?? 0),
                subtotal: Number(d.total_linea ?? 0),
              }));

              const titulo = "Pago registrado";

              const html = getFacturaEmailHTML({
                titulo,
                organizacionNombre,
                clienteNombre: cliente.nombre ?? "Cliente",
                clienteCorreo: cliente.correo,
                periodo: factura.periodo ?? "—",
                idFactura: factura.id_factura,
                estadoFactura: nuevoEstadoFactura,
                fechaVencimiento: factura.fecha_vencimiento,
                total: Number(factura.total ?? 0),
                saldo: Number(nuevoSaldo ?? 0),
                detalles,
              });

              const text = getFacturaEmailText({
                titulo,
                organizacionNombre,
                clienteNombre: cliente.nombre ?? "Cliente",
                clienteCorreo: cliente.correo,
                periodo: factura.periodo ?? "—",
                idFactura: factura.id_factura,
                estadoFactura: nuevoEstadoFactura,
                fechaVencimiento: factura.fecha_vencimiento,
                total: Number(factura.total ?? 0),
                saldo: Number(nuevoSaldo ?? 0),
                detalles: detalles.map((d) => ({
                  concepto: d.concepto,
                  cantidad: d.cantidad,
                  precio_unitario: d.precio_unitario,
                  subtotal: d.subtotal,
                })),
              });

              await resend.emails.send({
                from: "SandíaShake <noreply@thegreatestdev.org>",
                to: cliente.correo,
                subject: `Pago registrado · Factura #${factura.id_factura} · ${organizacionNombre}`,
                html,
                text,
              });
            }
          }
        }
      }
    } catch (mailErr) {
      console.error("Pago OK pero correo falló:", mailErr);
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
