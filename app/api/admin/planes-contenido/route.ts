import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("planes_contenido")
    .select(`
      id_plan,
      nombre,
      descripcion,
      precio,
      estado,
      plan_servicios (
        cantidad,
        servicios (
          id_servicio,
          nombre
        )
      )
    `)
    .neq("estado", "ELIMINADO")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const planes = (data ?? []).map((p: any) => ({
    id_plan: p.id_plan,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    estado: p.estado,
    servicios: (p.plan_servicios ?? []).map((ps: any) => ({
      id_servicio: ps.servicios.id_servicio,
      nombre: ps.servicios.nombre,
      cantidad: ps.cantidad,
    })),
  }));

  return NextResponse.json({ data: planes });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { nombre, descripcion, precio, servicios } = body;

  if (!nombre) {
    return NextResponse.json(
      { error: "Nombre requerido" },
      { status: 400 }
    );
  }

  /* -------------------------
     1️⃣ Create plan
  -------------------------- */

  const { data: plan, error: planError } = await supabase
    .from("planes_contenido")
    .insert({
      nombre,
      descripcion,
      precio,
      estado: "ACTIVO",
    })
    .select("id_plan")
    .single();

  if (planError) {
    return NextResponse.json(
      { error: planError.message },
      { status: 500 }
    );
  }

  /* -------------------------
     2️⃣ Insert services
  -------------------------- */

  if (servicios?.length) {
    const inserts = servicios.map((s: any) => ({
      id_plan: plan.id_plan,
      id_servicio: s.id_servicio,
      cantidad: s.cantidad,
    }));

    const { error: servicesError } = await supabase
      .from("plan_servicios")
      .insert(inserts);

    if (servicesError) {
      return NextResponse.json(
        { error: servicesError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}