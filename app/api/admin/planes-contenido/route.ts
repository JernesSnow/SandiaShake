import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("planes_contenido")
    .select("*")
    .neq("estado", "ELIMINADO")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabase
    .from("planes_contenido")
    .insert([
      {
        nombre: body.nombre,
        descripcion: body.descripcion,
        cantidad_arte: body.cantidad_arte,
        cantidad_reel: body.cantidad_reel,
        cantidad_copy: body.cantidad_copy,
        cantidad_video: body.cantidad_video,
        cantidad_carrusel: body.cantidad_carrusel,
        precio: body.precio,
        estado: "ACTIVO",
      },
    ]);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
