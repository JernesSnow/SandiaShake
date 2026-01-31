import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ===================== HELPERS ===================== */

async function requireAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData, error: authErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (authErr) {
    return { error: NextResponse.json({ error: authErr.message }, { status: 401 }) };
  }
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
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

function genTempPassword() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 4).toUpperCase() +
    "1!"
  );
}

/* ===================== GET ===================== */

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const admin = createSupabaseAdmin();

    const { data, error: qErr } = await admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, rol, estado, created_at")
      .eq("rol", "COLABORADOR")
      .neq("estado", "ELIMINADO")
      .order("id_usuario", { ascending: false });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    return NextResponse.json({ colaboradores: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ===================== POST (CREATE) ===================== */

export async function POST(req: Request) {
  try {
    const { perfil, error } = await requireAdmin();
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const nombre = String(body.nombre ?? "").trim();
    const correo = String(body.correo ?? "").trim().toLowerCase();
    let password = String(body.password ?? "").trim();

    if (!nombre || !correo) {
      return NextResponse.json(
        { error: "Nombre y correo son obligatorios" },
        { status: 400 }
      );
    }

    if (!password) password = genTempPassword();

    const admin = createSupabaseAdmin();

    const { data: createdAuth, error: authErr } =
      await admin.auth.admin.createUser({
        email: correo,
        password,
        email_confirm: true,
      });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const auth_user_id = createdAuth.user?.id;
    if (!auth_user_id) {
      return NextResponse.json(
        { error: "Auth user creado sin id" },
        { status: 500 }
      );
    }

    const { data: createdRow, error: dbErr } = await admin
      .from("usuarios")
      .insert({
        nombre,
        correo,
        rol: "COLABORADOR",
        estado: "ACTIVO",
        auth_user_id,
        created_by: perfil.id_usuario,
        updated_by: perfil.id_usuario,
      })
      .select("id_usuario, nombre, correo, rol, estado, created_at")
      .single();

    if (dbErr) {
      await admin.auth.admin.deleteUser(auth_user_id);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        colaborador: createdRow,
        temp_password: body.password ? undefined : password,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno creando colaborador" },
      { status: 500 }
    );
  }
}

/* ===================== PATCH ===================== */

export async function PATCH(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const id_usuario = Number(body.id_usuario);
    if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
      return NextResponse.json(
        { error: "id_usuario es obligatorio" },
        { status: 400 }
      );
    }

    const nombre = body.nombre ? String(body.nombre).trim() : undefined;
    const correo = body.correo ? String(body.correo).trim() : undefined;
    const estado = body.estado
      ? String(body.estado).trim().toUpperCase()
      : undefined;

    const admin = createSupabaseAdmin();

    const { data: current, error: curErr } = await admin
      .from("usuarios")
      .select("id_usuario, rol, auth_user_id, correo")
      .eq("id_usuario", id_usuario)
      .maybeSingle();

    if (curErr || !current) {
      return NextResponse.json(
        { error: "Colaborador no encontrado" },
        { status: 404 }
      );
    }

    if (current.rol !== "COLABORADOR") {
      return NextResponse.json(
        { error: "Solo puedes editar COLABORADOR" },
        { status: 400 }
      );
    }

    if (correo && correo !== current.correo && current.auth_user_id) {
      const { error: aErr } =
        await admin.auth.admin.updateUserById(current.auth_user_id, {
          email: correo,
        });
      if (aErr) {
        return NextResponse.json({ error: aErr.message }, { status: 400 });
      }
    }

    const patch: any = {};
    if (nombre) patch.nombre = nombre;
    if (correo) patch.correo = correo;
    if (estado) patch.estado = estado;

    const { data: updated, error: upErr } = await admin
      .from("usuarios")
      .update(patch)
      .eq("id_usuario", id_usuario)
      .select("id_usuario, nombre, correo, rol, estado, created_at")
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, colaborador: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* ===================== DELETE ===================== */

export async function DELETE(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const id_usuario = Number(url.searchParams.get("id_usuario"));

    if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
      return NextResponse.json(
        { error: "id_usuario es obligatorio" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data: current } = await admin
      .from("usuarios")
      .select("id_usuario, rol, auth_user_id")
      .eq("id_usuario", id_usuario)
      .maybeSingle();

    if (!current) {
      return NextResponse.json(
        { error: "Colaborador no encontrado" },
        { status: 404 }
      );
    }

    if (current.rol !== "COLABORADOR") {
      return NextResponse.json(
        { error: "Solo puedes eliminar COLABORADOR" },
        { status: 400 }
      );
    }

    await admin
      .from("usuarios")
      .update({ estado: "ELIMINADO" })
      .eq("id_usuario", id_usuario);

    if (current.auth_user_id) {
      await admin.auth.admin.deleteUser(current.auth_user_id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
