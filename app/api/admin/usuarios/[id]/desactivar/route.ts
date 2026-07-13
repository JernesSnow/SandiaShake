import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { unassignColaboradorFromOrganizaciones } from "@/lib/colaboradorDeactivation";

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

  const { data: target } = await admin
    .from("usuarios")
    .select("estado, auth_user_id")
    .eq("id_usuario", Number(id))
    .maybeSingle();

  if (target?.estado && target.estado !== "ACTIVO") {
    return NextResponse.json({ error: "El usuario ya está desactivado" }, { status: 400 });
  }

  const { error } = await admin.rpc("rpc_desactivar_usuario", {
    p_actor_id:  actorId,
    p_target_id: Number(id),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Revoke the Auth account too — otherwise the email stays locked in
  // auth.users and can never be used to register a new user, even though
  // the usuarios row is deactivated.
  if (target?.auth_user_id) {
    await admin.auth.admin.deleteUser(target.auth_user_id);
  }

  // They must also stop being tied to any organización and stop owning
  // in-flight tareas there (no-ops for roles that were never assigned).
  await unassignColaboradorFromOrganizaciones(admin, Number(id), actorId ?? Number(id));

  return NextResponse.json({ ok: true });
}
