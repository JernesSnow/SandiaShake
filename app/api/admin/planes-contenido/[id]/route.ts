import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ================= PATCH ================= */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ MUST await

  const planId = Number(id);

  if (!planId || isNaN(planId)) {
    return NextResponse.json(
      { error: "ID inválido." },
      { status: 400 }
    );
  }

  const body = await req.json();

  const { error } = await supabase
    .from("planes_contenido")
    .update({
      nombre: body.nombre,
      descripcion: body.descripcion,
      cantidad_arte: body.cantidad_arte,
      cantidad_reel: body.cantidad_reel,
      cantidad_copy: body.cantidad_copy,
      cantidad_video: body.cantidad_video,
      cantidad_carrusel: body.cantidad_carrusel,
      precio: body.precio,
      estado: body.estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id_plan", planId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

/* ================= DELETE ================= */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ MUST await

  const planId = Number(id);

  if (!planId || isNaN(planId)) {
    return NextResponse.json(
      { error: "ID inválido." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("planes_contenido")
    .update({
      estado: "INACTIVO",
      updated_at: new Date().toISOString(),
    })
    .eq("id_plan", planId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
