import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getActorId(admin: ReturnType<typeof createSupabaseAdmin>): Promise<number | null> {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("[getActorId] auth user:", user?.id ?? "NULL", "authError:", authError?.message ?? "none");
    if (!user) return null;
    const { data, error: dbError } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    console.log("[getActorId] db lookup result:", data, "dbError:", dbError?.message ?? "none");
    return data?.id_usuario ?? null;
  } catch (e: any) {
    console.log("[getActorId] EXCEPTION:", e?.message);
    return null;
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log("[PATCH usuarios] id:", id);

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  console.log("[PATCH usuarios] session user:", auth?.user?.id ?? "NULL", "authErr:", authErr?.message ?? "none");

  if (!auth?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const body = await req.json();
  console.log("[PATCH usuarios] body:", JSON.stringify(body));

  const actorId = await getActorId(admin);
  console.log("[PATCH usuarios] actorId resolved:", actorId);

  // Try RPC first, fall back to direct update so we can see which one runs
  const { data: rpcData, error: rpcError } = await admin.rpc("rpc_update_usuario", {
    p_actor_id:    actorId,
    p_target_id:   Number(id),
    p_nombre:      body.nombre,
    p_correo:      body.correo,
    p_rol:         body.rol,
    p_admin_nivel: body.admin_nivel ?? null,
    p_estado:      body.estado,
  });

  console.log("[PATCH usuarios] rpc result:", JSON.stringify(rpcData), "rpcError:", rpcError?.message ?? "none", "rpcErrorCode:", rpcError?.code ?? "none");

  if (rpcError) {
    // RPC doesn't exist yet — fall back to direct update so the UI doesn't break
    console.log("[PATCH usuarios] RPC failed, falling back to direct update");
    const { error: directError } = await admin
      .from("usuarios")
      .update({
        nombre:     body.nombre,
        correo:     body.correo,
        rol:        body.rol,
        admin_nivel: body.admin_nivel ?? null,
        estado:     body.estado,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id_usuario", Number(id));

    console.log("[PATCH usuarios] direct update error:", directError?.message ?? "none");
    if (directError) return NextResponse.json({ error: directError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
