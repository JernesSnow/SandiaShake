import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getFacturaEmailHTML, getFacturaEmailText } from "@/lib/emails/factura-template";

const resend = new Resend(process.env.RESEND_API_KEY);

type TipoNotificacion = "RECORDATORIO" | "PAGO_REGISTRADO";

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

    const body = await req.json();
    const { id_factura, tipo, subjectOverride } = body ?? {};

    const idFacturaNum = Number(id_factura);
    if (!Number.isFinite(idFacturaNum) || idFacturaNum <= 0) {
      return NextResponse.json({ error: "id_factura inválido" }, { status: 400 });
    }

    const tipoNotif = String(tipo || "RECORDATORIO").toUpperCase() as TipoNotificacion;
    if (tipoNotif !== "RECORDATORIO" && tipoNotif !== "PAGO_REGISTRADO") {
      return NextResponse.json(
        { error: "tipo inválido (RECORDATORIO | PAGO_REGISTRADO)" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes("REPLACE_ME")) {
      return NextResponse.json({ error: "RESEND_API_KEY no está configurada" }, { status: 500 });
    }

    const admin = createSupabaseAdmin();

    const { data: factura, error: fErr } = await admin
      .from("facturas")
      .select(`
        id_factura,
        id_organizacion,
        periodo,
        total,
        saldo,
        estado_factura,
        fecha_vencimiento,
        estado,
        organizaciones:organizaciones (
          id_organizacion,
          nombre,
          estado
        )
      `)
      .eq("id_factura", idFacturaNum)
      .maybeSingle();

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    if (!factura || factura.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Factura no encontrada o eliminada" }, { status: 404 });
    }

    const org = Array.isArray(factura.organizaciones)
      ? factura.organizaciones[0]
      : factura.organizaciones;

    if (!org || org.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Organización no encontrada o inactiva" }, { status: 400 });
    }

   
    const { data: vinculos, error: vErr } = await admin
      .from("organizacion_usuario")
      .select(`
        id_organizacion,
        estado,
        usuarios:usuarios!organizacion_usuario_id_usuario_fkey (
          id_usuario,
          nombre,
          correo,
          rol,
          estado
        )
      `)
      .eq("id_organizacion", factura.id_organizacion)
      .eq("estado", "ACTIVO");

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    const cliente = (vinculos ?? [])
      .map((x: any) => x.usuarios)
      .find((u: any) => u && u.rol === "CLIENTE" && u.estado === "ACTIVO" && u.correo);

    if (!cliente) {
      return NextResponse.json(
        { error: "No hay un usuario CLIENTE activo vinculado a esta organización (organizacion_usuario)." },
        { status: 400 }
      );
    }

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
        cantidad: Number(d.cantidad || 0),
        precio_unitario: Number(d.precio_unitario || 0),
        subtotal: Number(d.total_linea || 0),
      }));
    }

    const titulo = tipoNotif === "PAGO_REGISTRADO" ? "Pago registrado" : "Recordatorio de pago";

    const subject =
      subjectOverride?.trim() ||
      `SandíaShake · ${titulo} · Factura #${factura.id_factura} (${factura.periodo})`;

    const html = getFacturaEmailHTML({
      titulo,
      organizacionNombre: org.nombre,
      clienteNombre: cliente.nombre ?? "Cliente",
      clienteCorreo: cliente.correo,
      periodo: factura.periodo ?? "—",
      idFactura: factura.id_factura,
      estadoFactura: factura.estado_factura,
      fechaVencimiento: factura.fecha_vencimiento,
      total: Number(factura.total || 0),
      saldo: Number(factura.saldo || 0),
      detalles,
    });

    const text = getFacturaEmailText({
      titulo,
      organizacionNombre: org.nombre,
      clienteNombre: cliente.nombre ?? "Cliente",
      clienteCorreo: cliente.correo,
      periodo: factura.periodo ?? "—",
      idFactura: factura.id_factura,
      estadoFactura: factura.estado_factura,
      fechaVencimiento: factura.fecha_vencimiento,
      total: Number(factura.total || 0),
      saldo: Number(factura.saldo || 0),
      detalles: detalles.map(d => ({
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
      {
        ok: true,
        message: "Notificación enviada",
        to: cliente.correo,
        id_factura: factura.id_factura,
        tipo: tipoNotif,
        detalles_count: detalles.length,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
