import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getFacturaEmailHTML, getFacturaEmailText } from "@/lib/emails/factura-template";

const resend = new Resend(process.env.RESEND_API_KEY);

type TipoNotificacion = "RECORDATORIO" | "PAGO_REGISTRADO";

type Body = {
  id_factura: number;
  tipo?: TipoNotificacion;
  subjectOverride?: string;
};

type FacturaEmailDetalle = {
  concepto: string;
  descripcion?: string | null;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
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

    const body = (await req.json()) as Body;
    const id_factura = Number(body?.id_factura);
const rawTipo = String(body?.tipo ?? "RECORDATORIO").trim().toUpperCase();
const tipo: TipoNotificacion =
  rawTipo === "PAGO" || rawTipo === "PAGO_REGISTRADO" || rawTipo === "PAGO-REGISTRADO"
    ? "PAGO_REGISTRADO"
    : "RECORDATORIO";

    if (!Number.isFinite(id_factura) || id_factura <= 0) {
      return NextResponse.json({ error: "id_factura inválido" }, { status: 400 });
    }
    if (tipo !== "RECORDATORIO" && tipo !== "PAGO_REGISTRADO") {
  return NextResponse.json(
    { error: "tipo inválido (RECORDATORIO | PAGO_REGISTRADO)" },
    { status: 400 }
  );
}

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes("REPLACE_ME")) {
      return NextResponse.json({ error: "RESEND_API_KEY no está configurada" }, { status: 500 });
    }

    const admin = createSupabaseAdmin();

    // Factura
    const { data: factura, error: fErr } = await admin
      .from("facturas")
      .select("id_factura, id_organizacion, periodo, total, saldo, estado_factura, fecha_vencimiento, estado")
      .eq("id_factura", id_factura)
      .maybeSingle();

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    if (!factura || factura.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Factura no encontrada o eliminada" }, { status: 404 });
    }

    // Organización 
    const { data: org, error: orgErr } = await admin
      .from("organizaciones")
      .select("id_organizacion, nombre, estado")
      .eq("id_organizacion", factura.id_organizacion)
      .maybeSingle();

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
    if (!org || org.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Organización no encontrada o inactiva" }, { status: 400 });
    }

    // Link organización -> usuario cliente 
    const { data: vinculo, error: vErr } = await admin
      .from("organizacion_usuario")
      .select("id_usuario_cliente, estado")
      .eq("id_organizacion", factura.id_organizacion)
      .eq("estado", "ACTIVO")
      .limit(1)
      .maybeSingle();

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    if (!vinculo?.id_usuario_cliente) {
      return NextResponse.json({ error: "No hay usuario cliente activo vinculado a esta organización" }, { status: 400 });
    }

    // Cliente
    const { data: cliente, error: cErr } = await admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, rol, estado")
      .eq("id_usuario", vinculo.id_usuario_cliente)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!cliente || cliente.estado !== "ACTIVO" || cliente.rol !== "CLIENTE" || !cliente.correo) {
      return NextResponse.json({ error: "El usuario cliente no es válido o no tiene correo" }, { status: 400 });
    }

    // Detalles 
    let detalles: FacturaEmailDetalle[] = [];
    const { data: detData, error: detErr } = await admin
      .from("factura_detalles")
      .select("concepto, nota, tipo, cantidad, precio_unitario, total_linea, orden, estado")
      .eq("id_factura", factura.id_factura)
      .eq("estado", "ACTIVO")
      .order("orden", { ascending: true });

    if (!detErr && detData) {
      detalles = (detData as any[]).map((d) => ({
        concepto: d.concepto ?? "",
        descripcion: d.nota ?? null,
        categoria: d.tipo ?? "OTRO",
        cantidad: Number(d.cantidad ?? 0),
        precio_unitario: Number(d.precio_unitario ?? 0),
        subtotal: Number(d.total_linea ?? 0),
      }));
    }

    const titulo = tipo === "PAGO_REGISTRADO" ? "Pago registrado" : "Recordatorio de pago";

    const subject =
      body?.subjectOverride?.trim() ||
      `${titulo} · Factura #${factura.id_factura} · ${org.nombre}`;

    const html = getFacturaEmailHTML({
      titulo,
      organizacionNombre: org.nombre,
      clienteNombre: cliente.nombre ?? "Cliente",
      clienteCorreo: cliente.correo,
      periodo: factura.periodo ?? "—",
      idFactura: Number(factura.id_factura),
      estadoFactura: String(factura.estado_factura ?? "PENDIENTE"),
      fechaVencimiento: factura.fecha_vencimiento,
      total: Number(factura.total ?? 0),
      saldo: Number(factura.saldo ?? 0),
      detalles,
    });

    const text = getFacturaEmailText({
      titulo,
      organizacionNombre: org.nombre,
      clienteNombre: cliente.nombre ?? "Cliente",
      clienteCorreo: cliente.correo,
      periodo: factura.periodo ?? "—",
      idFactura: Number(factura.id_factura),
      estadoFactura: String(factura.estado_factura ?? "PENDIENTE"),
      fechaVencimiento: factura.fecha_vencimiento,
      total: Number(factura.total ?? 0),
      saldo: Number(factura.saldo ?? 0),
      detalles: detalles.map((d) => ({
        concepto: d.concepto,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
      })),
    });

    const { error: emailError } = await resend.emails.send({
      from: "SandíaShake <noreply@thegreatestdev.org>",
      to: cliente.correo,
      subject,
      html,
      text,
    });

    if (emailError) {
      return NextResponse.json({ error: emailError.message || "Error enviando correo" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, to: cliente.correo, id_factura: factura.id_factura, tipo, detalles_count: detalles.length },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
