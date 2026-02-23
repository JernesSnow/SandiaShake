import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function GET(req: Request) {
  try {

    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdmin();

    const url = new URL(req.url);
    const idOrgParam = url.searchParams.get("id_organizacion");
    const idOrg = idOrgParam ? Number(idOrgParam) : null;


    let query = admin
      .from("tareas")
      .select(`
        id_tarea,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        tipo_entregable,
        fecha_entrega,
        id_organizacion,
        id_colaborador,
        organizaciones!fk_tareas_organizacion(nombre),
        usuarios!fk_tareas_colaborador(nombre)
      `)
      .eq("estado", "ACTIVO");

    if (perfil.rol === "ADMIN") {
      if (idOrg) {
        query = query.eq("id_organizacion", idOrg);
      }
    }

    /* ================= CLIENTE ================= */

    else if (perfil.rol === "CLIENTE") {
      const { data: orgUser, error: orgErr } = await admin
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", perfil.id_usuario)
        .eq("estado", "ACTIVO")
        .maybeSingle();

      if (orgErr || !orgUser) {
        return NextResponse.json({ ok: true, data: [] });
      }

      query = query.eq("id_organizacion", orgUser.id_organizacion);
    }

    /* ================= COLABORADOR ================= */

    else if (perfil.rol === "COLABORADOR") {
      const { data: asigs } = await admin
        .from("asignacion_organizacion")
        .select("id_organizacion")
        .eq("id_colaborador", perfil.id_usuario)
        .eq("estado", "ACTIVO");

      const orgIds = (asigs ?? []).map((a) => a.id_organizacion);

      if (!orgIds.length) {
        return NextResponse.json({ ok: true, data: [] });
      }

      query = idOrg
        ? query.eq("id_organizacion", idOrg)
        : query.in("id_organizacion", orgIds);
    }



    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }


    const formatted = (data ?? []).map((t) => ({
      id_tarea: t.id_tarea,
      titulo: t.titulo,
      descripcion: t.descripcion,
      status_kanban: t.status_kanban,
      prioridad: t.prioridad,
      tipo_entregable: t.tipo_entregable,
      fecha_entrega: t.fecha_entrega,
      cliente: t.organizaciones?.nombre ?? "—",
      asignadoA: t.usuarios?.nombre ?? "—",
      id_organizacion: t.id_organizacion,
      id_colaborador: t.id_colaborador,
    }));

    return NextResponse.json({ ok: true, data: formatted });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}