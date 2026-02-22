export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const tareaId = Number(id);

    const admin = createSupabaseAdmin();

    const { id_entregable, decision, comentario } = await req.json();

    if (!id_entregable) {
      return NextResponse.json(
        { error: "Entregable inválido." },
        { status: 400 }
      );
    }

    if (!comentario?.trim()) {
      return NextResponse.json(
        { error: "Debe ingresar un comentario." },
        { status: 400 }
      );
    }

    if (!["APROBADO", "RECHAZADO"].includes(decision)) {
      return NextResponse.json(
        { error: "Decisión inválida." },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("entregables")
      .update({
        estado_aprobacion: decision,
        updated_at: new Date().toISOString(),
      })
      .eq("id_entregable", id_entregable)
      .eq("id_tarea", tareaId);

    if (updateError) throw updateError;


    await admin.from("tarea_comentarios").insert({
      id_tarea: tareaId,
      id_usuario: 1, 
      tipo_autor: "CLIENTE",
      comentario,
      estado: "ACTIVO",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("APROBACION ERROR:", e);
    return NextResponse.json(
      { error: e.message ?? "Error interno" },
      { status: 500 }
    );
  }
}