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
  const userId = Number(id);

  if (!userId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const actorId = await getActorId(admin);

  const { data, error } = await admin.rpc("rpc_toggle_usuario", {
    p_actor_id:  actorId,
    p_target_id: userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.error) {
    return NextResponse.json({ error: data.error }, { status: 404 });
  }

  const { activar, auth_user_id } = data as { activar: boolean; auth_user_id: string };

  await admin.auth.admin.updateUserById(auth_user_id, {
    ban_duration: activar ? "none" : "876000h",
  });

  return NextResponse.json({ ok: true });
}
