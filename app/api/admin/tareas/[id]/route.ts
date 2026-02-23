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

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "ID inválido" },
        { status: 400 }
      );
    }


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

    if (tareaError) {
      return NextResponse.json(
        { ok: false, error: tareaError.message },
        { status: 500 }
      );
    }

    if (!tarea) {
      return NextResponse.json(
        { ok: false, error: "Tarea no encontrada" },
        { status: 404 }
      );
    }


    const { data: folder } = await admin
      .from("google_drive_task_folders")
      .select("*")
      .eq("id_tarea", id)
      .maybeSingle();


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
      },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Task GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}