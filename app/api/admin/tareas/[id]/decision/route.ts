import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
    return { error: NextResponse.json({ error: authErr.message }, { status: 401 }) };
  }
  const user = userData?.user;
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const admin = createSupabaseAdmin();
  const { data: perfil, error } = await admin
    .from("usuarios")
    .select("rol, estado, id_usuario, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<Perfil>();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };

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
    if (!idTarea) return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });

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
      .select("id_tarea,id_organizacion,estado,status_kanban")
      .eq("id_tarea", idTarea)
      .maybeSingle();

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!tarea) return NextResponse.json({ error: "Tarea no existe" }, { status: 404 });

    if (String(tarea.estado ?? "").toUpperCase() === "ELIMINADO") {
      return NextResponse.json({ error: "Tarea no disponible" }, { status: 404 });
    }

    const { data: link, error: lErr } = await admin
      .from("organizacion_usuario")
      .select("id_cliente_usuario")
      .eq("id_organizacion", tarea.id_organizacion)
      .eq("id_usuario_cliente", perfil!.id_usuario)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });
    if (!link) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });


    const comentarioFinal =
      accion === "APROBAR"
        ? `APROBADO: ${comentario}`
        : `RECHAZADO: ${comentario}`;

    const { data: createdComment, error: cErr } = await admin
      .from("tarea_comentarios")
      .insert({
        id_tarea: idTarea,
        id_usuario: perfil!.id_usuario,
        tipo_autor: "CLIENTE",
        comentario: comentarioFinal,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      })
      .select(
        `
        id_comentario,
        id_tarea,
        id_usuario,
        tipo_autor,
        comentario,
        created_at,
        autor:usuarios!fk_tarea_comentarios_usuario (
          id_usuario,
          nombre
        )
      `
      )
      .single();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const nextStatus = accion === "APROBAR" ? "aprobada" : "en_progreso";

    const { data: updatedTask, error: uErr } = await admin
      .from("tareas")
      .update({ status_kanban: nextStatus, updated_at: new Date().toISOString() })
      .eq("id_tarea", idTarea)
      .select(
        "id_tarea,id_organizacion,id_colaborador,titulo,descripcion,status_kanban,prioridad,tipo_entregable,fecha_entrega,mes,estado,created_at,updated_at"
      )
      .maybeSingle();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    if (!updatedTask) return NextResponse.json({ error: "No se pudo actualizar la tarea" }, { status: 500 });

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
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}