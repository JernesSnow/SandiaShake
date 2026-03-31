import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ================= GET ================= */

export async function GET() {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("planes_contenido")
      .select(`
        id_plan,
        nombre,
        descripcion,
        precio,
        estado,
        plan_servicio (
          id_servicio,
          cantidad,
          servicios_catalogo (
            id_servicio,
            nombre,
            precio_publico
          )
        )
      `)
      .eq("estado", "ACTIVO")
      .order("id_plan", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const planes = (data ?? []).map((p: any) => {
      const servicios = (p.plan_servicio ?? []).map((ps: any) => ({
        id_servicio: ps.servicios_catalogo.id_servicio,
        nombre: ps.servicios_catalogo.nombre,
        cantidad: ps.cantidad,
        precio: ps.servicios_catalogo.precio_publico ?? 0,
      }));

      const precioServicios = servicios.reduce(
        (acc: number, s: any) => acc + s.precio * s.cantidad,
        0
      );

      return {
        id_plan: p.id_plan,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        estado: p.estado,
        servicios,
        precio_servicios_total: precioServicios,
      };
    });

    return NextResponse.json({ data: planes });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ================= POST ================= */

export async function POST(req: Request) {
  try {
    const admin = createSupabaseAdmin();
    const body = await req.json();

    const { nombre, descripcion, precio, servicios } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "Nombre requerido" },
        { status: 400 }
      );
    }

    const { data: plan, error } = await admin
      .from("planes_contenido")
      .insert({
        nombre,
        descripcion,
        precio,
        estado: "ACTIVO",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (servicios?.length) {
      const inserts = servicios.map((s: any) => ({
        id_plan: plan.id_plan,
        id_servicio: s.id_servicio,
        cantidad: s.cantidad ?? 1,
      }));

      await admin.from("plan_servicio").insert(inserts);
    }

    return NextResponse.json({ ok: true, id_plan: plan.id_plan });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ================= PATCH ================= */

export async function PATCH(req: Request) {
  try {
    const admin = createSupabaseAdmin();
    const body = await req.json();

    const { id_plan, nombre, descripcion, precio, servicios } = body;

    if (!id_plan) {
      return NextResponse.json(
        { error: "id_plan requerido" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("planes_contenido")
      .update({
        nombre,
        descripcion,
        precio,
      })
      .eq("id_plan", id_plan);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* reset services */

    await admin.from("plan_servicio").delete().eq("id_plan", id_plan);

    if (servicios?.length) {
      const inserts = servicios.map((s: any) => ({
        id_plan,
        id_servicio: s.id_servicio,
        cantidad: s.cantidad ?? 1,
      }));

      await admin.from("plan_servicio").insert(inserts);
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ================= DELETE ================= */

export async function DELETE(req: Request) {
  try {
    const admin = createSupabaseAdmin();

    const url = new URL(req.url);
    const id_plan = Number(url.searchParams.get("id"));

    if (!id_plan) {
      return NextResponse.json(
        { error: "id_plan requerido" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("planes_contenido")
      .update({ estado: "INACTIVO" })
      .eq("id_plan", id_plan);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error interno" },
      { status: 500 }
    );
  }
}