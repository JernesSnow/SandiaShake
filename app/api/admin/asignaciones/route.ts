import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

type PostBody = {
  id_colaborador: number;
  id_organizacion: number;
};

/* =========================================================
   GET – List collaborators assigned to an organization
========================================================= */

export async function GET(req: Request) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("id_organizacion");
    const colabId = searchParams.get("id_colaborador");

    const admin = createSupabaseAdmin();

    /* =========================================
       MODE 1: Get collaborators of an org
    ========================================= */
    if (orgId) {
      const { data, error } = await admin
        .from("asignacion_organizacion")
        .select(`
          id_colaborador,
          usuarios!fk_asignacion_clientes_colaborador (
            nombre,
            correo
          )
        `)
        .eq("id_organizacion", orgId)
        .eq("estado", "ACTIVO");

      if (error) throw error;

      const formatted = (data ?? []).map((a: any) => ({
        id_colaborador: a.id_colaborador,
        nombre: a.usuarios?.nombre,
        correo: a.usuarios?.correo,
      }));

      return NextResponse.json({ data: formatted });
    }

    /* =========================================
       MODE 2: Get organizations of a collaborator
    ========================================= */
    if (colabId) {
      const { data, error } = await admin
        .from("asignacion_organizacion")
        .select("id_organizacion")
        .eq("id_colaborador", colabId)
        .eq("estado", "ACTIVO");

      if (error) throw error;

      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: "Missing id_organizacion or id_colaborador" },
      { status: 400 }
    );

  } catch (e: any) {
    console.error("Asignaciones GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – Assign collaborator to organization (ADMIN only)
========================================================= */

export async function POST(req: Request) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      );
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as PostBody;

    const id_colaborador = Number(body.id_colaborador);
    const id_organizacion = Number(body.id_organizacion);

    if (!id_colaborador || !id_organizacion) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data: colab } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("id_usuario", id_colaborador)
      .maybeSingle();

    if (!colab) {
      return NextResponse.json(
        { error: "Colaborador no existe" },
        { status: 404 }
      );
    }

    if (colab.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Colaborador inactivo" },
        { status: 403 }
      );
    }

    if (colab.rol !== "COLABORADOR") {
      return NextResponse.json(
        { error: "El usuario no es colaborador" },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from("asignacion_organizacion")
      .select("id_asignacion")
      .eq("id_colaborador", id_colaborador)
      .eq("id_organizacion", id_organizacion)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya está asignado" },
        { status: 409 }
      );
    }

    const { data: inserted, error: insErr } = await admin
      .from("asignacion_organizacion")
      .insert({
        id_colaborador,
        id_organizacion,
        estado: "ACTIVO",
        created_by: perfil.id_usuario,
        updated_by: perfil.id_usuario,
      })
      .select("id_asignacion")
      .maybeSingle();

    if (insErr) {
      console.error(insErr);
      return NextResponse.json(
        { error: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, data: inserted },
      { status: 200 }
    );

  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – Soft remove collaborator (ADMIN only)
========================================================= */

export async function DELETE(req: Request) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      );
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const idOrganizacion = Number(url.searchParams.get("id_organizacion"));
    const idColaborador = Number(url.searchParams.get("id_colaborador"));

    if (!idOrganizacion || !idColaborador) {
      return NextResponse.json(
        { error: "Faltan parámetros" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { error: updErr } = await admin
      .from("asignacion_organizacion")
      .update({
        estado: "ELIMINADO",
        updated_by: perfil.id_usuario,
        updated_at: new Date().toISOString(),
      })
      .eq("id_organizacion", idOrganizacion)
      .eq("id_colaborador", idColaborador);

    if (updErr) {
      console.error(updErr);
      return NextResponse.json(
        { error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}