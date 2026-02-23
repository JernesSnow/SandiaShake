export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const tareaId = Number(id);

    if (!tareaId) {
      return NextResponse.json(
        { error: "Invalid tarea id" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("entregables")
      .select(
        "id_entregable,id_tarea,version_num,estado_aprobacion,drive_file_id,drive_file_name,drive_mime_type,drive_file_size,created_at,estado"
      )
      .eq("id_tarea", tareaId)
      .neq("estado", "ELIMINADO")
      .order("version_num", { ascending: false });

    if (error) {
      console.error("DB entregables error:", error);
      return NextResponse.json(
        { error: "Failed to load entregables" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
    });

  } catch (e: any) {
    console.error("ENTREGABLES GET ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}