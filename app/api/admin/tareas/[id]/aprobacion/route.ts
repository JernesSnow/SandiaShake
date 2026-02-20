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

    const now = new Date().toISOString();

    // 1) Actualizar estado del entregable
    const { error: updateError } = await admin
      .from("entregables")
      .update({
        estado_aprobacion: decision,
        updated_at: now,
      })
      .eq("id_entregable", id_entregable)
      .eq("id_tarea", tareaId);

    if (updateError) throw updateError;

    // 2) Insertar comentario en el chat
    //    IMPORTANTE: guardamos tipo_comentario para poder detectar rechazos consecutivos
    const tipo_comentario =
      decision === "RECHAZADO" ? "RECHAZO" : "APROBACION";

    const { data: comentarioInsertado, error: comentarioError } = await admin
      .from("tarea_comentarios")
      .insert({
        id_tarea: tareaId,
        id_usuario: 1, // luego idealmente lo cambiamos por el cliente real logueado
        tipo_autor: "CLIENTE",
        tipo_comentario,
        comentario,
        estado: "ACTIVO",
        created_at: now,
        updated_at: now,
      })
      .select("id_comentario")
      .maybeSingle();

    if (comentarioError) throw comentarioError;

    // 3) Si fue rechazo, revisar si ya van 2 rechazos seguidos del cliente
    if (decision === "RECHAZADO") {
      const { data: ultimos, error: ultErr } = await admin
        .from("tarea_comentarios")
        .select("id_comentario, tipo_comentario, created_at")
        .eq("id_tarea", tareaId)
        .eq("tipo_autor", "CLIENTE")
        .eq("estado", "ACTIVO")
        .in("tipo_comentario", ["RECHAZO", "APROBACION"])
        .order("created_at", { ascending: false })
        .limit(2);

      if (ultErr) throw ultErr;

      const hayDosComentarios = (ultimos ?? []).length === 2;
      const dosRechazosSeguidos =
        hayDosComentarios &&
        ultimos![0].tipo_comentario === "RECHAZO" &&
        ultimos![1].tipo_comentario === "RECHAZO";

      if (dosRechazosSeguidos) {
        const comentarioActualId =
          comentarioInsertado?.id_comentario ?? ultimos![0].id_comentario;

        const dedupe_key = `2rej_chat_task:${tareaId}:c:${comentarioActualId}`;

        const { error: outboxErr } = await admin.from("email_outbox").insert({
          event_type: "TWO_CONSECUTIVE_REJECTIONS_CHAT",
          dedupe_key,
          payload: {
            id_tarea: tareaId,
            id_entregable,
            comentario_id: comentarioActualId,
            created_at: now,
          },
        });

        // si ya existía por dedupe, no rompemos el flujo
        if (
          outboxErr &&
          !String(outboxErr.message).toLowerCase().includes("duplicate")
        ) {
          throw outboxErr;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("APROBACION ERROR:", e);
    return NextResponse.json(
      { error: e.message ?? "Error interno" },
      { status: 500 }
    );
  }
}