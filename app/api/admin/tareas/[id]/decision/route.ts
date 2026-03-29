import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { grantChilliPointsIfNotExists } from "@/lib/chilli-points";

type Perfil = {
  id_usuario: number;
  rol: string;
  estado: string;
  auth_user_id?: string;
};

function safeId(v: any) {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

async function getPerfil() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: authErr } = await supabase.auth.getUser();

  if (authErr) {
    return {
      error: NextResponse.json({ error: authErr.message }, { status: 401 }),
    };
  }

  const user = userData?.user;
  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const admin = createSupabaseAdmin();
  const { data: perfil, error } = await admin
    .from("usuarios")
    .select("rol, estado, id_usuario, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<Perfil>();

  if (error) {
    return {
      error: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!perfil) {
    return {
      error: NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      ),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  return { perfil };
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const rol = String(perfil!.rol ?? "").toUpperCase();
    if (rol !== "CLIENTE") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const idTarea = safeId(id);

    if (!idTarea) {
      return NextResponse.json(
        { error: "ID de tarea inválido" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accion = String(body?.accion ?? "").toUpperCase();
    const comentario = String(body?.comentario ?? "").trim();

    if (!comentario) {
      return NextResponse.json(
        { error: "Debes escribir un comentario antes de aprobar o rechazar" },
        { status: 400 }
      );
    }

    if (accion !== "APROBAR" && accion !== "RECHAZAR") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: tarea, error: tErr } = await admin
      .from("tareas")
      .select("id_tarea,id_organizacion,id_colaborador,estado,status_kanban,titulo")
      .eq("id_tarea", idTarea)
      .maybeSingle();

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    if (!tarea) {
      return NextResponse.json({ error: "Tarea no existe" }, { status: 404 });
    }

    if (String(tarea.estado ?? "").toUpperCase() === "ELIMINADO") {
      return NextResponse.json(
        { error: "Tarea no disponible" },
        { status: 404 }
      );
    }

    const { data: link, error: lErr } = await admin
      .from("organizacion_usuario")
      .select("id_cliente_usuario")
      .eq("id_organizacion", tarea.id_organizacion)
      .eq("id_usuario_cliente", perfil!.id_usuario)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (lErr) {
      return NextResponse.json({ error: lErr.message }, { status: 500 });
    }

    if (!link) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const comentarioFinal =
      accion === "APROBAR"
        ? `APROBADO: ${comentario}`
        : `RECHAZADO: ${comentario}`;

    const tipo_comentario =
      accion === "APROBAR" ? "APROBACION" : "RECHAZO";

    const now = new Date().toISOString();

    const { data: createdComment, error: cErr } = await admin
      .from("tarea_comentarios")
      .insert({
        id_tarea: idTarea,
        id_usuario: perfil!.id_usuario,
        tipo_autor: "CLIENTE",
        tipo_comentario,
        comentario: comentarioFinal,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
        created_at: now,
        updated_at: now,
      })
      .select(
        `
        id_comentario,
        id_tarea,
        id_usuario,
        tipo_autor,
        tipo_comentario,
        comentario,
        created_at,
        autor:usuarios!fk_tarea_comentarios_usuario (
          id_usuario,
          nombre
        )
      `
      )
      .single();

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const nextStatus = accion === "APROBAR" ? "aprobada" : "en_progreso";

    const { data: updatedTask, error: uErr } = await admin
      .from("tareas")
      .update({
        status_kanban: nextStatus,
        updated_at: now,
      })
      .eq("id_tarea", idTarea)
      .select(
        "id_tarea,id_organizacion,id_colaborador,titulo,descripcion,status_kanban,prioridad,tipo_entregable,fecha_entrega,mes,estado,created_at,updated_at"
      )
      .maybeSingle();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    if (!updatedTask) {
      return NextResponse.json(
        { error: "No se pudo actualizar la tarea" },
        { status: 500 }
      );
    }

    /* =========================================
       CHILLI RULE
       +4 points if first approval with 1 entregable
    ========================================= */

    if (accion === "APROBAR") {
      try {
        const { count } = await admin
          .from("entregables")
          .select("id_entregable", { count: "exact", head: true })
          .eq("id_tarea", idTarea)
          .neq("estado", "ELIMINADO");

        if (count === 1 && updatedTask.id_colaborador) {
          const motivo = `PRIMERA_APROBACION_UNICA:TAREA:${idTarea}`;

          await grantChilliPointsIfNotExists(admin, {
            id_colaborador: updatedTask.id_colaborador,
            puntos: 4,
            motivo,
            id_tarea: idTarea,
          });
        }
      } catch (err) {
        console.error("Chilli approval rule error:", err);
      }
    }

    if (accion === "RECHAZAR") {
      const { data: ultimos, error: ultErr } = await admin
        .from("tarea_comentarios")
        .select("id_comentario, tipo_comentario, created_at")
        .eq("id_tarea", idTarea)
        .eq("tipo_autor", "CLIENTE")
        .eq("estado", "ACTIVO")
        .in("tipo_comentario", ["RECHAZO", "APROBACION"])
        .order("created_at", { ascending: false })
        .limit(2);

      if (ultErr) {
        return NextResponse.json({ error: ultErr.message }, { status: 500 });
      }

      const hayDos = (ultimos ?? []).length === 2;
      const dosRechazosSeguidos =
        hayDos &&
        ultimos![0].tipo_comentario === "RECHAZO" &&
        ultimos![1].tipo_comentario === "RECHAZO";

      if (dosRechazosSeguidos) {
        const comentarioActualId = createdComment.id_comentario;
        const dedupe_key = `2rej_chat_task:${idTarea}:c:${comentarioActualId}`;

        const { error: notiErr } = await admin
          .from("tareas_notificaciones")
          .insert({
            event_type: "TWO_CONSECUTIVE_REJECTIONS_CHAT",
            dedupe_key,
            payload: {
              id_tarea: idTarea,
              id_comentario: comentarioActualId,
              id_colaborador: updatedTask.id_colaborador,
              id_organizacion: updatedTask.id_organizacion,
              accion,
              created_at: now,
            },
          });

        if (
          notiErr &&
          !String(notiErr.message).toLowerCase().includes("duplicate")
        ) {
          return NextResponse.json(
            { error: notiErr.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        accion,
        tarea: updatedTask,
        comentario: {
          id_comentario: createdComment.id_comentario,
          id_tarea: createdComment.id_tarea,
          id_usuario: createdComment.id_usuario,
          tipo_autor: createdComment.tipo_autor,
          tipo_comentario: createdComment.tipo_comentario,
          comentario: createdComment.comentario,
          created_at: createdComment.created_at,
          autor_nombre: Array.isArray((createdComment as any).autor)
            ? String((createdComment as any).autor?.[0]?.nombre ?? "—")
            : String((createdComment as any).autor?.nombre ?? "—"),
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}