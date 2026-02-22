import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

function parseMonthKey(input: string) {
  // expects "YYYY-MM"
  const [y, m] = String(input || "").split("-");
  const year = Number(y);
  const month = Number(m);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

export async function POST(req: Request) {
  try {
    // 🔐 AUTH
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const id_organizacion = Number(body?.id_organizacion);
    const monthKey = String(body?.monthKey ?? "").trim(); // "2026-02"

    if (!id_organizacion || !monthKey) {
      return NextResponse.json(
        { error: "id_organizacion y monthKey (YYYY-MM) son obligatorios." },
        { status: 400 }
      );
    }

    const parsed = parseMonthKey(monthKey);
    if (!parsed) {
      return NextResponse.json(
        { error: "monthKey inválido. Usa formato YYYY-MM." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // 🔎 Find tareas without factura
    const { data: tareas, error: errT } = await admin
      .from("tareas")
      .select(`
        id_tarea,
        titulo,
        tipo_entregable,
        prioridad,
        fecha_entrega,
        id_factura,
        estado
      `)
      .eq("id_organizacion", id_organizacion)
      .eq("estado", "ACTIVO")
      .is("id_factura", null);

    if (errT) throw errT;

    // 📅 Filter by month using fecha_entrega
    const monthTasks = (tareas ?? []).filter((t) => {
      if (!t.fecha_entrega) return false;

      const d = new Date(t.fecha_entrega);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      return y === parsed.year && m === parsed.month;
    });

    if (!monthTasks.length) {
      return NextResponse.json(
        { error: "No hay tareas para facturar en ese mes (sin factura)." },
        { status: 400 }
      );
    }

    // 💰 Total comes from frontend or future pricing logic
    const total = Number(body?.total ?? 0);

    if (!Number.isFinite(total) || total < 0) {
      return NextResponse.json(
        { error: "Total inválido." },
        { status: 400 }
      );
    }

    const periodo = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;

    // 🧾 Create factura
    const { data: factura, error: errF } = await admin
      .from("facturas")
      .insert({
        id_organizacion,
        periodo,
        total,
        saldo: total,
        estado_factura: "PENDIENTE",
        created_by: perfil.id_usuario,
        updated_by: perfil.id_usuario,
      })
      .select("id_factura")
      .single();

    if (errF) throw errF;

    // 🔗 Link tareas to factura
    const ids = monthTasks.map((t) => t.id_tarea);

    const { error: errU } = await admin
      .from("tareas")
      .update({
        id_factura: factura.id_factura,
        updated_by: perfil.id_usuario,
      })
      .in("id_tarea", ids);

    if (errU) throw errU;

    return NextResponse.json({
      ok: true,
      id_factura: factura.id_factura,
      tareas_enlazadas: ids.length,
    });

  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
