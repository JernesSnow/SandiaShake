import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Tipos mínimos para evitar el TS2339 */
type Perfil = {
  id_usuario: number;
  rol: string;
  estado: string;
  auth_user_id?: string;
};

type AutorJoin = { id_usuario: number; nombre: string };

/** ✅ Soporta que Supabase devuelva el join como objeto o como arreglo */
function pickAutorNombre(autor: unknown): string {
  if (!autor) return "—";

  // Caso: viene como arreglo
  if (Array.isArray(autor)) {
    const first = autor[0] as any;
    return String(first?.nombre ?? "—");
  }

  // Caso: viene como objeto
  const obj = autor as any;
  return String(obj?.nombre ?? "—");
}

async function getPerfil() {
  // 1) Validar sesión con server client (cookies)
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

  // 2) ✅ Leer perfil con ADMIN para evitar RLS/permisos en "usuarios"
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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await getPerfil();
    if (error) return error;

    const { id } = await ctx.params;
    const idTarea = safeNum(id);
    if (!idTarea) {
      return NextResponse.json({ error: "ID de tarea inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // ✅ Alias + FK explícita
    const { data, error: qErr } = await admin
      .from("tarea_comentarios")
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
      .eq("id_tarea", idTarea)
      .eq("estado", "ACTIVO")
      .order("created_at", { ascending: true });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const mapped = rows.map((r: any) => ({
      id_comentario: r.id_comentario,
      id_tarea: r.id_tarea,
      id_usuario: r.id_usuario,
      tipo_autor: r.tipo_autor,
      comentario: r.comentario,
      created_at: r.created_at,
      autor_nombre: pickAutorNombre(r.autor),
    }));

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
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

    const body = await req.json().catch(() => ({}));
    const comentario = String(body?.comentario ?? "").trim();
    if (!comentario) {
      return NextResponse.json({ error: "Comentario es obligatorio" }, { status: 400 });
    }

    const rol = String(perfil!.rol ?? "").toUpperCase();
    const tipo_autor = rol === "CLIENTE" ? "CLIENTE" : "COLABORADOR";

    const admin = createSupabaseAdmin();

    const { data: created, error: insErr } = await admin
      .from("tarea_comentarios")
      .insert({
        id_tarea: idTarea,
        id_usuario: perfil!.id_usuario,
        tipo_autor,
        comentario,
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

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id_comentario: created.id_comentario,
          id_tarea: created.id_tarea,
          id_usuario: created.id_usuario,
          tipo_autor: created.tipo_autor,
          comentario: created.comentario,
          created_at: created.created_at,
          autor_nombre: pickAutorNombre((created as any).autor),
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
