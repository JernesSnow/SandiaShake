import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/* ---------------- REQUIRE ADMIN PRIMARIO ---------------- */

async function requirePrimaryAdmin() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      ),
    };
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, admin_nivel, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.rol !== "ADMIN" || perfil.admin_nivel !== "PRIMARIO") {
    return {
      error: NextResponse.json(
        { error: "Solo el ADMIN PRIMARIO puede gestionar premios" },
        { status: 403 }
      ),
    };
  }

  return { perfil };
}

/* ---------------- GET PREMIOS ---------------- */

export async function GET() {
  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from("premios")
    .select("*")
    .neq("estado", "ELIMINADO")
    .order("id_premio", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    premios: data ?? [],
  });
}

/* ---------------- CREATE PREMIO ---------------- */

export async function POST(req: Request) {
  const { perfil, error } = await requirePrimaryAdmin();
  if (error) return error;

  const body = await req.json();

  const nombre = body.nombre?.trim();
  const descripcion = body.descripcion ?? "";
  const puntos_costo = Number(body.puntos_costo);

  if (!nombre || Number.isNaN(puntos_costo)) {
    return NextResponse.json(
      { error: "Nombre y puntos_costo son obligatorios" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error: dbErr } = await admin
    .from("premios")
    .insert({
      nombre,
      descripcion,
      puntos_costo,
      visible: true,
      estado: "ACTIVO",
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json(
      { error: dbErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ premio: data });
}

/* ---------------- UPDATE PREMIO ---------------- */

export async function PATCH(req: Request) {
  const { perfil, error } = await requirePrimaryAdmin();
  if (error) return error;

  const body = await req.json();
  const id_premio = Number(body.id_premio);

  if (!id_premio) {
    return NextResponse.json(
      { error: "id_premio requerido" },
      { status: 400 }
    );
  }

  const patch: any = {
    updated_by: perfil.id_usuario,
    updated_at: new Date().toISOString(),
  };

  if (body.nombre !== undefined) patch.nombre = body.nombre;
  if (body.descripcion !== undefined) patch.descripcion = body.descripcion;
  if (body.puntos_costo !== undefined) patch.puntos_costo = body.puntos_costo;
  if (body.visible !== undefined) patch.visible = body.visible;

  const admin = createSupabaseAdmin();

  const { data, error: dbErr } = await admin
    .from("premios")
    .update(patch)
    .eq("id_premio", id_premio)
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json(
      { error: dbErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ premio: data });
}

/* ---------------- DELETE PREMIO (SOFT DELETE) ---------------- */

export async function DELETE(req: Request) {
  const { error } = await requirePrimaryAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const id_premio = Number(url.searchParams.get("id_premio"));

  if (!id_premio) {
    return NextResponse.json(
      { error: "id_premio requerido" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();

  await admin
    .from("premios")
    .update({
      estado: "ELIMINADO",
      updated_at: new Date().toISOString(),
    })
    .eq("id_premio", id_premio);

  return NextResponse.json({ ok: true });
}