import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { puntaje } = await req.json();

    if (typeof puntaje !== "number" || puntaje < 0 || puntaje > 5) {
      return NextResponse.json({ error: "Puntaje inválido" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil } = await admin
      .from("usuarios")
      .select("id_usuario, rol")
      .eq("auth_user_id", user.id)
      .single();

    if (!perfil || perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Solo colaboradores" }, { status: 403 });
    }

    // Prevent duplicate entries for today
    const hoy = new Date().toISOString().split("T")[0];
    const { data: existing } = await admin
      .from("usuario_bienestar")
      .select("id_bienestar")
      .eq("id_usuario", perfil.id_usuario)
      .gte("fecha_revision", `${hoy}T00:00:00.000Z`)
      .lt("fecha_revision", `${hoy}T23:59:59.999Z`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, omitido: true });
    }

    const estadoAnimo = puntaje <= 1 ? "EN_RIESGO" : puntaje <= 3 ? "ATENTO" : "ESTABLE";

    const { error: insertError } = await admin.from("usuario_bienestar").insert({
      id_usuario: perfil.id_usuario,
      estado_animo: estadoAnimo,
      puntaje,
      fecha_revision: new Date().toISOString(),
      created_by: perfil.id_usuario,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
