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

    /*
      IMPORTANT:
      We explicitly specify the FK relationships to avoid:
      "Could not embed because more than one relationship was found"
    */

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

    // ADMIN can see all
    if (perfil.rol !== "ADMIN") {
      const { data: asigs } = await admin
        .from("asignacion_organizacion")
        .select("id_organizacion")
        .eq("id_colaborador", perfil.id_usuario)
        .eq("estado", "ACTIVO");

      const orgIds = (asigs ?? []).map((a) => a.id_organizacion);

      if (idOrg && !orgIds.includes(idOrg)) {
        return NextResponse.json(
          { error: "Sin permisos" },
          { status: 403 }
        );
      }

      if (!idOrg && orgIds.length === 0) {
        return NextResponse.json({ ok: true, data: [] });
      }

      if (idOrg) {
        query = query.eq("id_organizacion", idOrg);
      } else {
        query = query.in("id_organizacion", orgIds);
      }
    } else {
      if (idOrg) {
        query = query.eq("id_organizacion", idOrg);
      }
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

    /*
      🔥 THIS IS THE IMPORTANT PART
      Map DB fields → UI fields
      So your Kanban works correctly
    */

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
