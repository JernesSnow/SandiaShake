import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function POST(req: Request) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const id_organizacion = Number(body?.id_organizacion);
    const periodo = String(body?.periodo ?? "").trim();
    const fecha_vencimiento = body?.fecha_vencimiento || null;
    const items: any[] = Array.isArray(body?.items) ? body.items : [];

    if (!Number.isFinite(id_organizacion) || !periodo) {
      return NextResponse.json(
        { error: "id_organizacion y periodo son obligatorios." },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Debe incluir al menos un item." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    /* --------------------------------
       PREVENT DUPLICATE FACTURAS
    -------------------------------- */

    const { data: existingFactura } = await admin
      .from("facturas")
      .select("id_factura")
      .eq("id_organizacion", id_organizacion)
      .eq("periodo", periodo)
      .maybeSingle();

    if (existingFactura) {
      return NextResponse.json(
        { error: "Ya existe una factura para esta organización en ese periodo." },
        { status: 400 }
      );
    }

    /* --------------------------------
       CALCULATE TOTAL
    -------------------------------- */

    const total = items.reduce((acc: number, it: any) => {
      const cantidad = Number(it?.cantidad ?? 1);
      const precio = Number(it?.precio_unitario ?? 0);

      if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) {
        return acc;
      }

      return acc + cantidad * precio;
    }, 0);

    /* --------------------------------
       CREATE FACTURA
    -------------------------------- */

    const { data: factura, error: errF } = await admin
      .from("facturas")
      .insert({
        id_organizacion,
        periodo,
        total,
        saldo: total,
        fecha_vencimiento,
        estado_factura: "PENDIENTE",
        created_by: perfil.id_usuario,
        updated_by: perfil.id_usuario,
      })
      .select("id_factura")
      .single();

    if (errF) throw errF;

    /* --------------------------------
       CREATE FACTURA DETALLES
    -------------------------------- */

    const detalles = items.map((it: any, idx: number) => {
      const cantidad = Number(it?.cantidad ?? 1);
      const precio = Number(it?.precio_unitario ?? 0);

      return {
        id_factura: factura.id_factura,
        concepto: it?.concepto ?? "Servicio",
        cantidad,
        precio_unitario: precio,
        total_linea: cantidad * precio,
        tipo: it?.tipo ?? "SERVICIO",
        referencia_id: it?.referencia_id ?? null,
        orden: idx + 1,
        created_by: perfil.id_usuario,
        updated_by: perfil.id_usuario,
      };
    });

    const { error: errD } = await admin
      .from("factura_detalles")
      .insert(detalles);

    if (errD) throw errD;

    /* --------------------------------
      LOAD SERVICES AND PLAN SERVICES
    -------------------------------- */

    const servicioIds = [
      ...new Set(
        items
          .filter((it: any) => it.tipo === "SERVICIO")
          .map((it: any) => it?.referencia_id)
          .filter(Boolean)
      ),
    ];

    const planIds = [
      ...new Set(
        items
          .filter((it: any) => it.tipo === "PLAN")
          .map((it: any) => it?.referencia_id)
          .filter(Boolean)
      ),
    ];

    let servicioMap = new Map<number, string>();
    let planServiciosMap = new Map<number, any[]>();

    /* ------------------------------
      Load individual services
    ------------------------------ */

    if (servicioIds.length) {
      const { data: servicios } = await admin
        .from("servicios_catalogo")
        .select("id_servicio, nombre")
        .in("id_servicio", servicioIds);

      servicioMap = new Map(
        (servicios || []).map((s: any) => [s.id_servicio, s.nombre])
      );
    }

    /* ------------------------------
      Load plan services
    ------------------------------ */

    if (planIds.length) {
      const { data: planes } = await admin
        .from("plan_servicio")
        .select(`
          id_plan,
          cantidad,
          servicios_catalogo (
            id_servicio,
            nombre
          )
        `)
        .in("id_plan", planIds);

      (planes || []).forEach((p: any) => {
        const list = planServiciosMap.get(p.id_plan) || [];

        list.push({
          id_servicio: p.servicios_catalogo.id_servicio,
          nombre: p.servicios_catalogo.nombre,
          cantidad: p.cantidad ?? 1,
        });

        planServiciosMap.set(p.id_plan, list);
      });
    }

    /* --------------------------------
       GENERATE TAREAS
    -------------------------------- */

    const tareasInsert: any[] = [];

    items.forEach((item: any) => {

      /* ------------------------------
        SINGLE SERVICE
      ------------------------------ */

      if (item.tipo === "SERVICIO") {

        const qty = Math.max(1, Number(item?.cantidad ?? 1));

        const nombreServicio =
          servicioMap.get(item?.referencia_id) ||
          item?.concepto ||
          "Servicio";

        for (let i = 0; i < qty; i++) {
          tareasInsert.push({
            id_organizacion,
            id_colaborador: perfil.id_usuario,
            titulo: nombreServicio,
            descripcion: `Generado desde factura ${factura.id_factura}`,
            tipo_entregable: "Otro",
            prioridad: "Media",
            fecha_entrega: item?.fecha_entrega ?? null,
            mes: periodo,
            id_factura: factura.id_factura,
            created_by: perfil.id_usuario,
            updated_by: perfil.id_usuario,
          });
        }

      }

      /* ------------------------------
        PLAN SERVICES
      ------------------------------ */

      if (item.tipo === "PLAN") {

        const serviciosPlan = planServiciosMap.get(item.referencia_id) || [];

        serviciosPlan.forEach((servicio: any) => {

          for (let i = 0; i < servicio.cantidad; i++) {

            tareasInsert.push({
              id_organizacion,
              id_colaborador: perfil.id_usuario,
              titulo: servicio.nombre,
              descripcion: `Servicio incluido en plan (Factura ${factura.id_factura})`,
              tipo_entregable: "Otro",
              prioridad: "Media",
              fecha_entrega: item?.fecha_entrega ?? null,
              mes: periodo,
              id_factura: factura.id_factura,
              created_by: perfil.id_usuario,
              updated_by: perfil.id_usuario,
            });

          }

        });

      }

    });

    if (tareasInsert.length) {
      const { error: errT } = await admin
        .from("tareas")
        .insert(tareasInsert);

      if (errT) {
        console.error("Error creando tareas:", errT);
      }
    }

    return NextResponse.json({
      ok: true,
      id_factura: factura.id_factura,
      tareas_creadas: tareasInsert.length,
    });

  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}