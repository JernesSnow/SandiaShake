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
        { error: "Solo el ADMIN PRIMARIO puede ajustar Chilli Points" },
        { status: 403 }
      ),
    };
  }

  return { perfil };
}

/* ---------------- BALANCE ---------------- */

async function getBalance(admin: ReturnType<typeof createSupabaseAdmin>, id_usuario: number) {
  const { data: earned } = await admin
    .from("chilli_movimientos")
    .select("puntos")
    .eq("id_colaborador", id_usuario)
    .eq("estado", "ACTIVO");

  const { data: spent } = await admin
    .from("canje_premio")
    .select("puntos_usados")
    .eq("id_colaborador", id_usuario)
    .neq("estado", "ELIMINADO");

  const totalEarned = (earned ?? []).reduce((acc, r) => acc + Number(r.puntos), 0);
  const totalSpent = (spent ?? []).reduce((acc, r) => acc + Number(r.puntos_usados), 0);

  return totalEarned - totalSpent;
}

/* ---------------- GET (HISTORIAL DE AJUSTES) ---------------- */

export async function GET(req: Request) {
  const { error } = await requirePrimaryAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const id_usuario = Number(url.searchParams.get("id_usuario"));

  if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
    return NextResponse.json(
      { error: "id_usuario requerido" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();

  const { data, error: qErr } = await admin
    .from("chilli_movimientos")
    .select("id_movimiento, puntos, motivo, fecha, created_by")
    .eq("id_colaborador", id_usuario)
    .in("tipo", ["OTORGAR", "ELIMINAR"])
    .eq("estado", "ACTIVO")
    .order("fecha", { ascending: false });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  const adminIds = Array.from(
    new Set((data ?? []).map((m) => m.created_by).filter((v): v is number => !!v))
  );

  const adminNames = new Map<number, string>();

  if (adminIds.length) {
    const { data: admins } = await admin
      .from("usuarios")
      .select("id_usuario, nombre")
      .in("id_usuario", adminIds);

    for (const a of admins ?? []) adminNames.set(a.id_usuario, a.nombre);
  }

  const ajustes = (data ?? []).map((m) => ({
    id_movimiento: m.id_movimiento,
    puntos: m.puntos,
    motivo: m.motivo,
    fecha: m.fecha,
    admin_nombre: adminNames.get(m.created_by) ?? "Admin",
  }));

  return NextResponse.json({ ajustes });
}

/* ---------------- POST (CREAR AJUSTE MANUAL) ---------------- */

export async function POST(req: Request) {
  const { perfil, error } = await requirePrimaryAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const id_usuario = Number(body.id_usuario);
  const puntos = Number(body.puntos);
  const motivo = String(body.motivo ?? "").trim();

  if (!Number.isFinite(id_usuario) || id_usuario <= 0) {
    return NextResponse.json(
      { error: "id_usuario es obligatorio" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(puntos) || puntos === 0) {
    return NextResponse.json(
      { error: "La cantidad de puntos debe ser un número entero distinto de 0" },
      { status: 400 }
    );
  }

  if (!motivo) {
    return NextResponse.json(
      { error: "El motivo del ajuste es obligatorio" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();

  const { data: target } = await admin
    .from("usuarios")
    .select("id_usuario, rol")
    .eq("id_usuario", id_usuario)
    .maybeSingle();

  if (!target || !["COLABORADOR", "ADMIN"].includes(target.rol)) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  if (puntos < 0) {
    const balance = await getBalance(admin, id_usuario);
    if (balance + puntos < 0) {
      return NextResponse.json(
        { error: `No se pueden restar más puntos de los que tiene disponibles (${balance})` },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();

  const { data: movimiento, error: insertErr } = await admin
    .from("chilli_movimientos")
    .insert({
      id_colaborador: id_usuario,
      puntos,
      tipo: puntos > 0 ? "OTORGAR" : "ELIMINAR",
      motivo,
      estado: "ACTIVO",
      fecha: now,
      created_at: now,
      updated_at: now,
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, movimiento });
}
