import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PostBody = {
  id_organizacion: number;
  id_plan: number;
};

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
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

  if (error || !perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { perfil };
}

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = (await req.json()) as PostBody;

    const id_organizacion = Number(body.id_organizacion);
    const id_plan = Number(body.id_plan);

    if (!id_organizacion || !id_plan) {
      return NextResponse.json(
        { error: "Campos inválidos" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // 📅 Get current month & year
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    // 🔍 Get plan to calculate total deliverables
    const { data: plan, error: planErr } = await admin
      .from("planes_contenido")
      .select(`
        cantidad_arte,
        cantidad_reel,
        cantidad_copy,
        cantidad_video,
        cantidad_carrusel
      `)
      .eq("id_plan", id_plan)
      .maybeSingle();

    if (planErr || !plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    const cantidad_total =
      (plan.cantidad_arte ?? 0) +
      (plan.cantidad_reel ?? 0) +
      (plan.cantidad_copy ?? 0) +
      (plan.cantidad_video ?? 0) +
      (plan.cantidad_carrusel ?? 0);

    // 🚫 Prevent duplicate plan in same month
    const { data: existente } = await admin
      .from("organizacion_plan_contenido")
      .select("id_org_plan")
      .eq("id_organizacion", id_organizacion)
      .eq("mes", mes)
      .eq("anio", anio)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un plan activo este mes" },
        { status: 409 }
      );
    }

    // ✅ Insert plan
    const { error: insertErr } = await admin
      .from("organizacion_plan_contenido")
      .insert({
        id_organizacion,
        id_plan,
        mes,
        anio,
        cantidad_total,
        entregables_usados: 0,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
