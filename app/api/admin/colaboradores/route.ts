import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({ colaboradores: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const nombre = String(body.nombre ?? "").trim();
    const correo = String(body.correo ?? "").trim();
    let password = String(body.password ?? "").trim();
    if (!nombre || !correo) {
      return NextResponse.json({ error: "Nombre y correo son obligatorios" }, { status: 400 });
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
      return NextResponse.json({ error: "Auth user creado sin id" }, { status: 500 });
    }

    const { data: createdRow, error: dbErr } = await admin
      .from("usuarios")
      .insert({
        nombre,
        correo,
        rol: "COLABORADOR",
        estado: "ACTIVO",
        auth_user_id,
      })
      .select("id_usuario, nombre, correo, rol, estado, created_at")
      .single();

    if (dbErr) {
      await admin.auth.admin.deleteUser(auth_user_id); 
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { colaborador: createdRow, temp_password: body.password ? undefined : password },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
//Eliminar y editar un colaborador
export async function PATCH(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const id_usuario = Number(body.id_usuario);
    if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
      return NextResponse.json({ error: "id_usuario es obligatorio" }, { status: 400 });
    }

    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : undefined;
    const correo = body.correo !== undefined ? String(body.correo).trim() : undefined;
    const estado = body.estado !== undefined ? String(body.estado).trim().toUpperCase() : undefined;

    if (nombre !== undefined && !nombre) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    if (correo !== undefined && !correo) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }
    if (estado !== undefined && !["ACTIVO", "INACTIVO", "SUSPENDIDO"].includes(estado)) {
    
    }

    const admin = createSupabaseAdmin();

    const { data: current, error: curErr } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado, auth_user_id, correo")
      .eq("id_usuario", id_usuario)
      .maybeSingle();

    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
    if (current.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Solo puedes editar COLABORADOR" }, { status: 400 });
    }

    if (correo !== undefined && current.auth_user_id && correo !== current.correo) {
      const { error: aErr } = await admin.auth.admin.updateUserById(current.auth_user_id, {
        email: correo,
      });
      if (aErr) {
        return NextResponse.json({ error: aErr.message }, { status: 400 });
      }
    }

    const patch: any = {};
    if (nombre !== undefined) patch.nombre = nombre;
    if (correo !== undefined) patch.correo = correo;
    if (estado !== undefined) patch.estado = estado === "SUSPENDIDO" ? "INACTIVO" : estado;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, colaborador: current }, { status: 200 });
    }

    const { data: updated, error: upErr } = await admin
      .from("usuarios")
      .update(patch)
      .eq("id_usuario", id_usuario)
      .select("id_usuario, nombre, correo, rol, estado, created_at")
      .single();

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, colaborador: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const idParam = url.searchParams.get("id_usuario");
    const id_usuario = Number(idParam);

    if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
      return NextResponse.json({ error: "id_usuario es obligatorio" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: current, error: curErr } = await admin
      .from("usuarios")
      .select("id_usuario, rol, auth_user_id")
      .eq("id_usuario", id_usuario)
      .maybeSingle();

    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
    if (current.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Solo puedes eliminar COLABORADOR" }, { status: 400 });
    }


    const { error: delErr } = await admin
      .from("usuarios")
      .update({ estado: "ELIMINADO" })
      .eq("id_usuario", id_usuario);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (current.auth_user_id) {
      await admin.auth.admin.deleteUser(current.auth_user_id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
