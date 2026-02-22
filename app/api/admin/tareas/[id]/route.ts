import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createSupabaseAdmin();

    const { id: idParam } = await context.params;
    const id = Number(idParam);

    console.log("🔍 Incoming task ID param:", idParam);
    console.log("🔍 Parsed numeric ID:", id);

    if (!id || Number.isNaN(id)) {
      console.log("❌ Invalid ID");
      return NextResponse.json(
        { ok: false, error: "ID inválido", debug: { idParam } },
        { status: 400 }
      );
    }

    /* -------------------------
       1️⃣ Fetch tarea
    -------------------------- */
    const { data: tarea, error: tareaError } = await admin
      .from("tareas")
      .select(`
        id_tarea,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        fecha_entrega,
        estado
      `)
      .eq("id_tarea", id)
      .maybeSingle();

    console.log("📦 Tarea result:", tarea);
    console.log("❗ Tarea error:", tareaError);

    if (tareaError) {
      return NextResponse.json(
        { ok: false, error: tareaError.message },
        { status: 500 }
      );
    }

    if (!tarea) {
      console.log("❌ No tarea found for ID:", id);
      return NextResponse.json(
        { ok: false, error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    /* -------------------------
       2️⃣ Fetch folder
    -------------------------- */
    const { data: folder, error: folderError } = await admin
      .from("google_drive_task_folders")
      .select("*")
      .eq("id_tarea", id)
      .maybeSingle();

    console.log("📁 Folder result:", folder);
    console.log("❗ Folder error:", folderError);

    /* -------------------------
       3️⃣ Return everything
    -------------------------- */
    return NextResponse.json(
      {
        ok: true,
        data: {
          id_tarea: tarea.id_tarea,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion ?? null,
          status_kanban: tarea.status_kanban,
          prioridad: tarea.prioridad ?? "Media",
          fecha_entrega: tarea.fecha_entrega ?? null,
          googleDriveUrl: folder?.folder_url ?? null,
        },
        debug: {
          tareaRaw: tarea,
          folderRaw: folder,
          folderError,
        },
      },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("🔥 FATAL ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}