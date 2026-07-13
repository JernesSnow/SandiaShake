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

    // 3a. Próxima entrega — la tarea activa (no aprobada) con fecha_entrega más
    // cercana. Más útil para el cliente que un "% completado" que se diluye a
    // medida que se generan más tareas por facturación.
    const todayStr = new Date().toISOString().slice(0, 10);
    const proximaEntrega = t
      .filter(x => x.status_kanban !== "aprobada" && x.fecha_entrega && x.fecha_entrega >= todayStr)
      .sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime())[0] ?? null;

    // 3b. Aprobación/rechazo — la única aprobación real en el sistema es a nivel
    // de tarea (el "aprobado" de un entregable individual no siempre se mantiene
    // en sync, p. ej. cuando se arrastra la tarjeta en el Kanban). "Aprobadas"
    // ya viene del status_kanban; "rechazadas" se cuenta por las tareas que
    // tienen al menos un comentario de rechazo del cliente (el único registro
    // durable de un rechazo, ya que la tarea vuelve a "en_progreso" después).
    const tareaIds = t.map(x => x.id_tarea);
    let tareasRechazadas = 0;

    if (tareaIds.length > 0) {
      const { data: rechazos } = await admin
        .from("tarea_comentarios")
        .select("id_tarea")
        .in("id_tarea", tareaIds)
        .eq("tipo_comentario", "RECHAZO")
        .eq("tipo_autor", "CLIENTE")
        .eq("estado", "ACTIVO");

      tareasRechazadas = new Set((rechazos ?? []).map(r => r.id_tarea)).size;
    }

    // 3c. Mensajes sin leer por tarea (comentarios del equipo que el cliente
    // todavía no ha leído — se apoya en tarea_comentario_lecturas, la misma
    // tabla que usa el chat de la tarea para marcar como leído).
    let mensajesSinLeer: {
      id_tarea: number;
      titulo: string;
      tipo: string | null;
      fecha_entrega: string | null;
      unread_count: number;
    }[] = [];

    if (tareaIds.length > 0) {
      const { data: comentarios } = await admin
        .from("tarea_comentarios")
        .select("id_comentario, id_tarea")
        .in("id_tarea", tareaIds)
        .neq("tipo_autor", "CLIENTE")
        .eq("estado", "ACTIVO");

      const comentarioIds = (comentarios ?? []).map(c => c.id_comentario);
      let leidosSet = new Set<number>();

      if (comentarioIds.length > 0) {
        const { data: lecturas } = await admin
          .from("tarea_comentario_lecturas")
          .select("id_comentario")
          .eq("id_usuario", perfil.id_usuario)
          .in("id_comentario", comentarioIds);

        leidosSet = new Set((lecturas ?? []).map(l => l.id_comentario));
      }

      const unreadCountByTarea = new Map<number, number>();
      for (const c of comentarios ?? []) {
        if (!leidosSet.has(c.id_comentario)) {
          unreadCountByTarea.set(c.id_tarea, (unreadCountByTarea.get(c.id_tarea) ?? 0) + 1);
        }
      }

      const tareaById = new Map(t.map(x => [x.id_tarea, x]));

      mensajesSinLeer = Array.from(unreadCountByTarea.entries())
        .map(([id_tarea, unread_count]) => {
          const tarea = tareaById.get(id_tarea);
          return {
            id_tarea,
            titulo: tarea?.titulo ?? "",
            tipo: tarea?.tipo_entregable ?? null,
            fecha_entrega: tarea?.fecha_entrega ?? null,
            unread_count,
          };
        })
        .sort((a, b) => b.unread_count - a.unread_count)
        .slice(0, 10);
    }

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
        telefono:    org.telefono,
        correo:      org.correo,
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
        mensajesSinLeer,
        proximaEntrega: proximaEntrega ? {
          id_tarea:      proximaEntrega.id_tarea,
          titulo:        proximaEntrega.titulo,
          fecha_entrega: proximaEntrega.fecha_entrega,
        } : null,
      },
      aprobaciones: {
        aprobadas:  aprobadas.length,
        rechazadas: tareasRechazadas,
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
