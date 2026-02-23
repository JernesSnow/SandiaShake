import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };

  return { perfil };
}

function safeId(v: any) {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? s : null;
}

const ALLOWED_STATUS = new Set(["pendiente", "en_progreso", "en_revision", "aprobada", "archivada"]);
const ALLOWED_PRIO = new Set(["Alta", "Media", "Baja"]);
const ALLOWED_TIPO = new Set(["Arte", "Reel", "Copy", "Video", "Carrusel", "Otro"]);

type Ctx = { params: Promise<{ id: string }> };

const selectWithJoins = `
  id_tarea,
  id_organizacion,
  id_colaborador,
  titulo,
  descripcion,
  status_kanban,
  prioridad,
  tipo_entregable,
  fecha_entrega,
  mes,
  estado,
  created_at,
  updated_at,
  organizaciones:organizaciones(nombre)
`;

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeId(id);
    if (!idTarea) return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });

    const perfilId = safeId(perfil?.id_usuario);
    if (!perfilId) return NextResponse.json({ error: "Perfil inválido (id_usuario)" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const rol = String(perfil!.rol ?? "").toUpperCase();
    const isAdmin = rol === "ADMIN";
    const isColab = rol === "COLABORADOR";

    if (!isAdmin && !isColab) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const admin = createSupabaseAdmin();

    if (!isAdmin) {
      const { data: t, error: tErr } = await admin
        .from("tareas")
        .select("id_tarea,id_colaborador,estado")
        .eq("id_tarea", idTarea)
        .maybeSingle();

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
      if (!t) return NextResponse.json({ error: "Tarea no existe" }, { status: 404 });

      if (String(t.estado ?? "").toUpperCase() === "ELIMINADO") {
        return NextResponse.json({ error: "Tarea no disponible" }, { status: 404 });
      }

      const tareaColabId = safeId(t.id_colaborador);
      if (!tareaColabId || tareaColabId !== perfilId) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    const errors: string[] = [];

    if (body?.titulo !== undefined) {
      const titulo = String(body.titulo ?? "").trim();
      if (!titulo) errors.push("Título inválido");
      else updateData.titulo = titulo;
    }

    if (body?.descripcion !== undefined) updateData.descripcion = String(body.descripcion ?? "");

    if (body?.status_kanban !== undefined) {
      const s = String(body.status_kanban ?? "").toLowerCase();
      if (!ALLOWED_STATUS.has(s)) errors.push("Estado inválido");
      else updateData.status_kanban = s;
    }

    if (body?.prioridad !== undefined) {
      const p = String(body.prioridad ?? "");
      if (p && !ALLOWED_PRIO.has(p)) errors.push("Prioridad inválida");
      else updateData.prioridad = p || "Media";
    }

    if (body?.tipo_entregable !== undefined) {
      const t = String(body.tipo_entregable ?? "");
      if (t && !ALLOWED_TIPO.has(t)) errors.push("Tipo_entregable inválido");
      else updateData.tipo_entregable = t || "Otro";
    }

    if (body?.fecha_entrega !== undefined) {
      const f = String(body.fecha_entrega ?? "").trim();
      updateData.fecha_entrega = f ? f : null;
    }

    if (body?.mes !== undefined) {
      const mes = String(body.mes ?? "").trim();
      updateData.mes = mes ? mes : null;
    }

    if (isAdmin) {
      if (body?.id_organizacion !== undefined) {
        const orgId = safeId(body.id_organizacion);
        if (!orgId || orgId === "0") errors.push("id_organizacion inválido");
        else updateData.id_organizacion = Number(orgId);
      }

      if (body?.id_colaborador !== undefined) {
        const colId = safeId(body.id_colaborador);
        if (!colId) errors.push("id_colaborador inválido");
        else updateData.id_colaborador = Number(colId);
      }
    } else {
      if (body?.id_organizacion !== undefined || body?.id_colaborador !== undefined) {
        return NextResponse.json({ error: "Sin permisos para reasignar tarea" }, { status: 403 });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    let q = admin.from("tareas").update(updateData).eq("id_tarea", idTarea);
    if (!isAdmin) q = q.eq("id_colaborador", perfilId);

    const { error: updErr } = await q;
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    const { data: row, error: rowErr } = await admin
      .from("tareas")
      .select(selectWithJoins)
      .eq("id_tarea", idTarea)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json({ error: rowErr?.message ?? "No se pudo leer la tarea" }, { status: 500 });
    }

    const { data: u } = await admin
      .from("usuarios")
      .select("id_usuario,nombre")
      .eq("id_usuario", row.id_colaborador)
      .maybeSingle();

    const finalRow = { ...row, colaborador: u ? { nombre: u.nombre } : null };

    return NextResponse.json({ ok: true, data: finalRow }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    if (String(perfil?.rol ?? "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const idTarea = safeId(id);
    if (!idTarea) return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });

    const admin = createSupabaseAdmin();
    const { error: delErr } = await admin.from("tareas").delete().eq("id_tarea", idTarea);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}