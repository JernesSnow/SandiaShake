export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { grantChilliPointsIfNotExists } from "@/lib/chilli-points";

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
    const supabase = await createSupabaseServer();

    /* ============================
       GET CURRENT LOGGED USER
    ============================ */

    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: perfil } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (!perfil) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const userId = perfil.id_usuario;

    /* ---------------------------
       CHECK DUPLICATE FILE
    --------------------------- */

    const { data: existing } = await admin
      .from("entregables")
      .select("*")
      .eq("drive_file_id", body.drive_file_id)
      .eq("id_tarea", tareaId)
      .limit(1)
      .maybeSingle();

    let entregableRow = existing;

    if (!entregableRow) {

      /* ---------------------------
         get latest version
      --------------------------- */

      const { data: last } = await admin
        .from("entregables")
        .select("version_num")
        .eq("id_tarea", tareaId)
        .order("version_num", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (last?.version_num ?? 0) + 1;

      /* ---------------------------
         insert deliverable
      --------------------------- */

      const now = new Date().toISOString();

      const { data, error } = await admin
        .from("entregables")
        .insert({
          id_tarea: tareaId,
          version_num: nextVersion,
          drive_file_id: body.drive_file_id,
          drive_file_name: body.drive_file_name,
          drive_mime_type: body.drive_mime_type,
          drive_file_size: body.drive_file_size,
          drive_folder_url: body.drive_folder_url,
          estado_aprobacion: "PENDIENTE",
          estado: "ACTIVO",
          creado_por: userId,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) {
        console.error("Insert entregable error FULL:", error);
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }

      entregableRow = data;
    }

    /* ---------------------------
       CHILLI POINTS RULE
       +2 if delivered before deadline
    --------------------------- */

    try {

      const { data: tarea } = await admin
        .from("tareas")
        .select("id_colaborador, fecha_entrega")
        .eq("id_tarea", tareaId)
        .maybeSingle();

      if (tarea?.id_colaborador && tarea?.fecha_entrega) {

        const dueDate = new Date(tarea.fecha_entrega);
        const nowDate = new Date();

        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (nowDate <= endOfDay) {

          const motivo =
            `ENTREGA_PUNTUAL:TAREA:${tareaId}:ENTREGABLE:${entregableRow.id_entregable}`;

          await grantChilliPointsIfNotExists(admin, {
            id_colaborador: tarea.id_colaborador,
            puntos: 2,
            motivo,
            id_tarea: tareaId,
            id_entregable: entregableRow.id_entregable
          });

        }

      }

    } catch (err) {
      console.error("Chilli rule error:", err);
    }

    return NextResponse.json({
      ok: true,
      data: entregableRow
    });

  } catch (e: any) {

    console.error("ENTREGABLES POST ERROR:", e);

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}