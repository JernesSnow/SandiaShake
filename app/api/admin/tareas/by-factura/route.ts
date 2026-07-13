import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!perfil || perfil.estado !== "ACTIVO" || (perfil.rol !== "ADMIN" && perfil.rol !== "CLIENTE")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const url = new URL(req.url);
    const idFactura = Number(url.searchParams.get("id_factura"));

    if (!Number.isFinite(idFactura) || idFactura <= 0) {
      return NextResponse.json(
        { error: "id_factura es requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // Un CLIENTE solo puede ver las tareas de una factura de su propia
    // organización, y nunca tareas archivadas (mismo criterio que el Kanban).
    if (perfil.rol === "CLIENTE") {
      const { data: ou } = await admin
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", perfil.id_usuario)
        .eq("estado", "ACTIVO")
        .maybeSingle();

      const { data: factura } = await admin
        .from("facturas")
        .select("id_organizacion")
        .eq("id_factura", idFactura)
        .maybeSingle();

      if (!ou?.id_organizacion || !factura || factura.id_organizacion !== ou.id_organizacion) {
        return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
      }
    }

    let q = admin
      .from("tareas")
      .select("id_tarea, titulo, status_kanban, prioridad, tipo_entregable")
      .eq("id_factura", idFactura)
      .neq("estado", "ELIMINADO");

    if (perfil.rol === "CLIENTE") {
      q = q.neq("status_kanban", "archivada");
    }

    const { data, error: qErr } = await q.order("id_tarea", { ascending: true });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    // Las tareas no guardan precio propio. Se crean una por unidad de cada
    // item de factura_detalles, en el mismo orden en que se insertan (items
    // no-PLAN, expandidos por cantidad) — por eso NO se puede enlazar por
    // "titulo === concepto" (se rompe si alguien renombra la tarea después).
    // En su lugar, reconstruimos el orden real: factura_detalles ordenado por
    // "orden" y expandido por cantidad, contra TODAS las tareas de la factura
    // (incluidas las eliminadas, para no desalinear la posición) ordenadas
    // por id_tarea.
    const [{ data: detalles }, { data: todasLasTareas }] = await Promise.all([
      admin
        .from("factura_detalles")
        .select("cantidad, precio_unitario, tipo, orden")
        .eq("id_factura", idFactura)
        .order("orden", { ascending: true }),
      admin
        .from("tareas")
        .select("id_tarea")
        .eq("id_factura", idFactura)
        .order("id_tarea", { ascending: true }),
    ]);

    const precioSecuencia: number[] = [];
    for (const d of detalles ?? []) {
      if (d.tipo === "PLAN") continue;
      const cantidad = Number(d.cantidad) || 0;
      for (let i = 0; i < cantidad; i++) {
        precioSecuencia.push(Number(d.precio_unitario));
      }
    }

    const precioByIdTarea = new Map<number, number>();
    (todasLasTareas ?? []).forEach((t, idx) => {
      if (idx < precioSecuencia.length) {
        precioByIdTarea.set(t.id_tarea, precioSecuencia[idx]);
      }
    });

    const withPrecio = (data ?? []).map((t) => ({
      ...t,
      precio_unitario: precioByIdTarea.get(t.id_tarea) ?? null,
    }));

    return NextResponse.json({ ok: true, data: withPrecio }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
