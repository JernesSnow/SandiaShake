import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PostBody = { id_colaborador: number; id_organizacion: number };
type DeleteBody = { id_asignacion: number };

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, admin_nivel, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilErr) {
    return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  }
  if (!perfil) {
    return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  }
  if (perfil.estado !== "ACTIVO") {
    return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  }
  if (perfil.rol !== "ADMIN") {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  }

  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const idColaborador = Number(url.searchParams.get("id_colaborador") ?? "");

    if (!idColaborador) {
      return NextResponse.json({ error: "Ingrese el  id_colaborador" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data, error: qErr } = await admin
      .from("asignacion_organizacion")
      .select(`
        id_asignacion,
        id_organizacion,
        estado,
        organizaciones:organizaciones ( id_organizacion, nombre, estado )
      `)
      .eq("id_colaborador", idColaborador)
      .eq("estado", "ACTIVO");

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    const mapped = (data ?? [])
      .filter((r: any) => r.organizaciones && r.organizaciones.estado !== "ELIMINADO")
      .map((r: any) => ({
        id_asignacion: r.id_asignacion,
        id_organizacion: r.id_organizacion,
        nombre: r.organizaciones?.nombre ?? "",
      }));

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = (await req.json().catch(() => null)) as PostBody | null;
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const id_colaborador = Number(body.id_colaborador);
    const id_organizacion = Number(body.id_organizacion);

    if (!id_colaborador || !id_organizacion) {
      return NextResponse.json({ error: "Faltan campos obligatorios, por favor ingrese todos los datos" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: colab } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("id_usuario", id_colaborador)
      .maybeSingle();

    if (!colab) return NextResponse.json({ error: "Colaborador no existe" }, { status: 404 });
    if (colab.estado !== "ACTIVO") return NextResponse.json({ error: "Colaborador inactivo" }, { status: 403 });
    if (colab.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "El usuario no es colaborador" }, { status: 400 });
    }

    const { data: org } = await admin
      .from("organizaciones")
      .select("id_organizacion, nombre, estado")
      .eq("id_organizacion", id_organizacion)
      .maybeSingle();

    if (!org) return NextResponse.json({ error: "La organización no existe" }, { status: 404 });
    if (org.estado === "ELIMINADO") return NextResponse.json({ error: "Organización eliminada" }, { status: 403 });

    const { data: ya } = await admin
      .from("asignacion_organizacion")
      .select("id_asignacion")
      .eq("id_colaborador", id_colaborador)
      .eq("id_organizacion", id_organizacion)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (ya) {
      return NextResponse.json({ error: "El colaborador ya está asignado a esta organización" }, { status: 409 });
    }

    const { data: inserted, error: insErr } = await admin
      .from("asignacion_organizacion")
      .insert({
        id_colaborador,
        id_organizacion,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      })
      .select("id_asignacion, id_organizacion")
      .maybeSingle();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        data: {
          id_asignacion: inserted?.id_asignacion,
          id_organizacion,
          nombre: org.nombre ?? "",
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = (await req.json().catch(() => null)) as DeleteBody | null;
    if (!body) return NextResponse.json({ error: "Información inválida" }, { status: 400 });

    const id_asignacion = Number(body.id_asignacion);
    if (!id_asignacion) {
      return NextResponse.json({ error: "Falta id_asignacion" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { error: updErr } = await admin
      .from("asignacion_organizacion")
      .update({
        estado: "ELIMINADO",
        updated_by: perfil!.id_usuario,
        updated_at: new Date().toISOString(),
      })
      .eq("id_asignacion", id_asignacion);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
