import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error)
    return {
      error: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  if (!perfil)
    return {
      error: NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      ),
    };

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const url = new URL(req.url);
    const idOrgParam = url.searchParams.get("id_organizacion");
    const idOrg = idOrgParam ? Number(idOrgParam) : null;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();

    if (rol === "ADMIN") {
      let q = admin
        .from("tareas")
        .select(
          "id_tarea,id_organizacion,id_colaborador,titulo,descripcion,status_kanban,prioridad,tipo_entregable,fecha_entrega,mes,estado,created_at,updated_at"
        )
        .neq("estado", "ELIMINADO");

      if (idOrg) q = q.eq("id_organizacion", idOrg);

      const { data, error: qErr } = await q.order("created_at", {
        ascending: false,
      });
      if (qErr)
        return NextResponse.json({ error: qErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
    }



    const { data: asigs, error: asigErr } = await admin
      .from("asignacion_organizacion")
      .select("id_organizacion")
      .eq("id_colaborador", perfil!.id_usuario)
      .eq("estado", "ACTIVO");

    if (asigErr)
      return NextResponse.json({ error: asigErr.message }, { status: 500 });

    const orgIds = (asigs ?? [])
      .map((r: any) => Number(r.id_organizacion))
      .filter((n: any) => Number.isFinite(n));

    if (idOrg && !orgIds.includes(idOrg)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (!idOrg && orgIds.length === 0) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    let q = admin
      .from("tareas")
      .select(
        "id_tarea,id_organizacion,id_colaborador,titulo,descripcion,status_kanban,prioridad,tipo_entregable,fecha_entrega,mes,estado,created_at,updated_at"
      )
      .neq("estado", "ELIMINADO");

    if (idOrg) {
      q = q.eq("id_organizacion", idOrg);
    } else {
      q = q.in("id_organizacion", orgIds);
    }

    const { data, error: qErr } = await q.order("created_at", {
      ascending: false,
    });
    if (qErr)
      return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
