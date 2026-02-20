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

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!perfil) {
    return {
      error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }),
    };
  }
  if (perfil.estado !== "ACTIVO") {
    return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  }

  return { perfil };
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PUT(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeNum(id);
    if (!idTarea) {
      return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 1) Traer ids de comentarios de la tarea
    const { data: comentarios, error: cErr } = await admin
      .from("tarea_comentarios")
      .select("id_comentario")
      .eq("id_tarea", idTarea)
      .eq("estado", "ACTIVO");

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const ids = (comentarios ?? []).map((x: any) => Number(x.id_comentario)).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, marked: 0 }, { status: 200 });
    }

    // 2) Ver cuáles ya tienen lectura para este usuario
    const { data: yaLeidos, error: lErr } = await admin
      .from("tarea_comentario_lecturas")
      .select("id_comentario")
      .eq("id_usuario", perfil!.id_usuario)
      .in("id_comentario", ids);

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    const leidosSet = new Set((yaLeidos ?? []).map((x: any) => Number(x.id_comentario)));

    // 3) Insertar lecturas faltantes
    const nuevos = ids
      .filter((idc) => !leidosSet.has(idc))
      .map((idc) => ({
        id_comentario: idc,
        id_usuario: perfil!.id_usuario,
        // leido_at tiene default now()
      }));

    if (nuevos.length === 0) {
      return NextResponse.json({ ok: true, marked: 0 }, { status: 200 });
    }

    const { error: insErr } = await admin
      .from("tarea_comentario_lecturas")
      .insert(nuevos);

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, marked: nuevos.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}