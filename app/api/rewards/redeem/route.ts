import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id_colaborador = Number(body.id_colaborador);
    const id_premio = Number(body.id_premio);

    if (!id_colaborador || !id_premio) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    /* GET PREMIO */

    const { data: premio, error: premioErr } = await admin
      .from("premios")
      .select("id_premio,puntos_costo")
      .eq("id_premio", id_premio)
      .single();

    if (premioErr || !premio) {
      return NextResponse.json(
        { error: "Premio no encontrado" },
        { status: 404 }
      );
    }

    /* INSERT CANJE */

    const { error: insertErr } = await admin
      .from("canje_premio")
      .insert({
        id_colaborador,
        id_premio,
        puntos_usados: premio.puntos_costo,
        estado: "ACTIVO",
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}