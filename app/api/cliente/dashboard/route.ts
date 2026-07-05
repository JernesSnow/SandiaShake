import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function GET() {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (perfil.rol !== "CLIENTE") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const admin = createSupabaseAdmin();

    // 1. Resolve organisation
    const { data: link } = await admin
      .from("organizacion_usuario")
      .select(`id_organizacion, organizaciones(
        id_organizacion, nombre, descripcion, pais, ciudad, canton, telefono, correo,
        estado_pago_organizacion(estado_cuenta, dias_mora)
      )`)
      .eq("id_usuario_cliente", perfil.id_usuario)
      .limit(1)
      .maybeSingle();

    if (!link?.organizaciones) {
      return NextResponse.json({ noOrg: true });
    }

    const org: any = link.organizaciones;
    const orgId: number = org.id_organizacion;

    // 2. Fetch tasks + facturas in parallel
    const [{ data: tareas }, { data: facturas }] = await Promise.all([
      admin
        .from("tareas")
        .select("id_tarea, titulo, status_kanban, fecha_entrega, created_at, tipo_entregable")
        .eq("id_organizacion", orgId)
        .neq("estado", "ELIMINADO")
        .order("created_at", { ascending: false }),
      admin
        .from("facturas")
        .select("id_factura, periodo, total, saldo, estado_factura, fecha_vencimiento, created_at")
        .eq("id_organizacion", orgId)
        .eq("estado", "ACTIVO")
        .order("created_at", { ascending: false }),
    ]);

    const t = tareas ?? [];
    const f = facturas ?? [];

    // 3. Task stats
    const totalTareas      = t.length;
    const enRevision       = t.filter(x => x.status_kanban === "en_revision");
    const aprobadas        = t.filter(x => x.status_kanban === "aprobada");
    const enProgreso       = t.filter(x => x.status_kanban === "en_progreso");
    const pendientes       = t.filter(x => x.status_kanban === "pendiente");

    // 4. Billing stats
    const totalFacturado  = f.reduce((s, x) => s + (x.total ?? 0), 0);
    const saldoTotal      = f.reduce((s, x) => s + (x.saldo ?? 0), 0);
    const facturasPagadas = f.filter(x => x.estado_factura === "PAGADA").length;
    const facturasVencidas = f.filter(x => x.estado_factura === "VENCIDA");

    // Nearest unpaid factura
    const proximaFactura = f
      .filter(x => x.estado_factura !== "PAGADA" && x.fecha_vencimiento)
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())[0] ?? null;

    // 5. Recent activity (last 5 status changes visible to client)
    const recentTareas = t.slice(0, 8);

    return NextResponse.json({
      ok: true,
      org: {
        id_organizacion: orgId,
        nombre:      org.nombre,
        descripcion: org.descripcion,
        ciudad:      org.ciudad,
        pais:        org.pais,
        diasMora:    org.estado_pago_organizacion?.[0]?.dias_mora ?? 0,
        estadoCuenta: org.estado_pago_organizacion?.[0]?.estado_cuenta ?? null,
      },
      tareas: {
        total:        totalTareas,
        enRevision:   enRevision.length,
        aprobadas:    aprobadas.length,
        enProgreso:   enProgreso.length,
        pendientes:   pendientes.length,
        // Tasks pending client action (most urgent)
        paraTuAprobacion: enRevision.slice(0, 10).map(x => ({
          id_tarea:     x.id_tarea,
          titulo:       x.titulo,
          tipo:         x.tipo_entregable,
          fecha_entrega: x.fecha_entrega,
        })),
        recientes: recentTareas.map(x => ({
          id_tarea:      x.id_tarea,
          titulo:        x.titulo,
          status_kanban: x.status_kanban,
          tipo:          x.tipo_entregable,
          fecha_entrega:  x.fecha_entrega,
        })),
      },
      facturacion: {
        totalFacturado,
        saldoTotal,
        facturasPagadas,
        facturasVencidas: facturasVencidas.length,
        totalFacturas: f.length,
        proximaFactura: proximaFactura ? {
          id_factura:        proximaFactura.id_factura,
          periodo:           proximaFactura.periodo,
          saldo:             proximaFactura.saldo,
          estado_factura:    proximaFactura.estado_factura,
          fecha_vencimiento: proximaFactura.fecha_vencimiento,
        } : null,
        historial: f.slice(0, 6).map(x => ({
          id_factura:     x.id_factura,
          periodo:        x.periodo,
          total:          x.total,
          saldo:          x.saldo,
          estado_factura: x.estado_factura,
          fecha_vencimiento: x.fecha_vencimiento,
        })),
      },
    });

  } catch (e: any) {
    console.error("[/api/cliente/dashboard]", e);
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
