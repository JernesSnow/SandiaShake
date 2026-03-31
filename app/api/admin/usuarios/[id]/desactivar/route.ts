import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

async function getActorId(admin: ReturnType<typeof createSupabaseAdmin>): Promise<number | null> {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    return data?.id_usuario ?? null;
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const actorId = await getActorId(admin);

  const { error } = await admin.rpc("rpc_desactivar_usuario", {
    p_actor_id:  actorId,
    p_target_id: Number(id),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
