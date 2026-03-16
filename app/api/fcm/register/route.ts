import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError("No auth", 401);

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();

  if (!token) return jsonError("Token requerido", 400);

  const { data: u } = await admin
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!u) return jsonError("Usuario no encontrado", 404);

  const { error } = await admin
    .from("fcm_tokens")
    .upsert(
      {
        id_usuario: u.id_usuario,
        token,
        activo: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "token",
      }
    );

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}