import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ================= TYPES ================= */

type PostBody = {
  id_colaborador: number;
  id_organizacion: number;
};

/* ================= AUTH VALIDATION ================= */

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      ),
    };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilErr) {
    return {
      error: NextResponse.json(
        { error: perfilErr.message },
        { status: 500 }
      ),
    };
  }

  if (!perfil) {
    return {
      error: NextResponse.json(
        { error: "Perfil no configurado" },
        { status: 403 }
      ),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      ),
    };
  }

  if (perfil.rol !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      ),
    };
  }

  return { perfil };
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const idOrganizacion = Number(url.searchParams.get("id_organizacion"));
    const idColaborador = Number(url.searchParams.get("id_colaborador"));

    const admin = createSupabaseAdmin();

    /* ================= CASE 1: ORGANIZATIONS OF A COLABORADOR ================= */
    if (idColaborador) {
      const { data: asignaciones, error: qErr } = await admin
        .from("asignacion_organizacion")
        .select("id_asignacion, id_organizacion")
        .eq("id_colaborador", idColaborador)
        .eq("estado", "ACTIVO");

      if (qErr) {
        console.error(qErr);
        return NextResponse.json(
          { error: qErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ok: true, data: asignaciones ?? [] },
        { status: 200 }
      );
    }

    /* ================= CASE 2: COLABORADORES OF AN ORGANIZATION ================= */
    if (idOrganizacion) {
      const { data: asignaciones, error: qErr } = await admin
        .from("asignacion_organizacion")
        .select("id_asignacion, id_colaborador")
        .eq("id_organizacion", idOrganizacion)
        .eq("estado", "ACTIVO");

      if (qErr) {
        console.error(qErr);
        return NextResponse.json(
          { error: qErr.message },
          { status: 500 }
        );
      }

      if (!asignaciones?.length) {
        return NextResponse.json(
          { ok: true, data: [] },
          { status: 200 }
        );
      }

      const ids = asignaciones.map((a) => a.id_colaborador);

      const { data: usuarios, error: uErr } = await admin
        .from("usuarios")
        .select("id_usuario, nombre, correo, estado")
        .in("id_usuario", ids)
        .eq("estado", "ACTIVO");

      if (uErr) {
        console.error(uErr);
        return NextResponse.json(
          { error: uErr.message },
          { status: 500 }
        );
      }

      const mapped = asignaciones
        .map((a) => {
          const user = usuarios?.find(
            (u) => u.id_usuario === a.id_colaborador
          );

          if (!user) return null;

          return {
            id_asignacion: a.id_asignacion,
            id_colaborador: user.id_usuario,
            nombre: user.nombre,
            correo: user.correo,
          };
        })
        .filter(Boolean);

      return NextResponse.json(
        { ok: true, data: mapped },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Debe enviar id_organizacion o id_colaborador" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ================= POST ================= */

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

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

    /* Validate colaborador */
    const { data: colab } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("id_usuario", id_colaborador)
      .maybeSingle();

    if (!colab)
      return NextResponse.json(
        { error: "Colaborador no existe" },
        { status: 404 }
      );

    if (colab.estado !== "ACTIVO")
      return NextResponse.json(
        { error: "Colaborador inactivo" },
        { status: 403 }
      );

    if (colab.rol !== "COLABORADOR")
      return NextResponse.json(
        { error: "El usuario no es colaborador" },
        { status: 400 }
      );

    /* Prevent duplicates */
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

    /* Insert */
    const { data: inserted, error: insErr } = await admin
      .from("asignacion_organizacion")
      .insert({
        id_colaborador,
        id_organizacion,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
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
      {
        ok: true,
        data: inserted,
      },
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

/* ================= DELETE ================= */

export async function DELETE(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

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
        updated_by: perfil!.id_usuario,
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
