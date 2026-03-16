export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ============================
   GET deliverables
============================ */

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await ctx.params;
    const tareaId = Number(id);

    if (!Number.isFinite(tareaId)) {
      return NextResponse.json(
        { error: "Invalid tarea id" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("entregables")
      .select(`
        id_entregable,
        id_tarea,
        version_num,
        estado_aprobacion,
        drive_file_id,
        drive_file_name,
        drive_mime_type,
        drive_file_size,
        created_at,
        estado
      `)
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


/* ============================
   CREATE deliverable (new version)
============================ */

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await ctx.params;
    const tareaId = Number(id);

    if (!Number.isFinite(tareaId)) {
      return NextResponse.json(
        { error: "Invalid tarea id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const admin = createSupabaseAdmin();

    /* get latest version */

    const { data: last } = await admin
      .from("entregables")
      .select("version_num")
      .eq("id_tarea", tareaId)
      .order("version_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (last?.version_num ?? 0) + 1;

    /* insert new deliverable */

    const { data, error } = await admin
      .from("entregables")
      .insert({
        id_tarea: tareaId,
        version_num: nextVersion,
        drive_file_id: body.drive_file_id,
        drive_file_name: body.drive_file_name,
        drive_mime_type: body.drive_mime_type,
        drive_file_size: body.drive_file_size,
        estado_aprobacion: "PENDIENTE",
        estado: "ACTIVO"
      })
      .select()
      .single();

    if (error) {
      console.error("Insert entregable error:", error);

      return NextResponse.json(
        { error: "Failed to create entregable" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data
    });

  } catch (e: any) {

    console.error("ENTREGABLES POST ERROR:", e);

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}