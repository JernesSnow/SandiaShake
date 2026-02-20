import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfil() {
  const supabase = await createSupabaseServer();

  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return { error: NextResponse.json({ error: authErr.message }, { status: 401 }) };
  }

  const user = userData?.user;
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };

  return { perfil };
}

export async function GET() {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const admin = createSupabaseAdmin();

    const { data, error: rpcErr } = await admin.rpc("get_unread_task_comment_counts", {
      p_user_id: perfil!.id_usuario,
    });

    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

    // data: [{ id_tarea, unread_count }]
    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}