export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const entregableId = Number(id);

    if (!Number.isFinite(entregableId)) {
      return NextResponse.json(
        { error: "Invalid entregable id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { estado } = body;

    if (!["APROBADO", "RECHAZADO"].includes(estado)) {
      return NextResponse.json(
        { error: "Invalid estado value" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("entregables")
      .update({
        estado_aprobacion: estado,
        fecha_respuesta_cliente: new Date().toISOString(),
      })
      .eq("id_entregable", entregableId);

    if (error) {
      console.error("Update estado error:", error);

      return NextResponse.json(
        { error: "Failed to update estado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    console.error("PATCH estado error:", e);

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}