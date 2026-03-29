export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await ctx.params;
    const entregableId = Number(id);

    if (!entregableId) {
      return NextResponse.json(
        { error: "Invalid entregable id" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("entregables")
      .update({
        estado: "ELIMINADO"
      })
      .eq("id_entregable", entregableId);

    if (error) {
      console.error(error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true
    });

  } catch (e: any) {

    console.error(e);

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}