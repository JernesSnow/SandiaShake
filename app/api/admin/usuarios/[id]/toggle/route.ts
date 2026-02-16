import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

  const { data: usuario } = await admin
    .from("usuarios")
    .select("estado, auth_user_id")
    .eq("id_usuario", userId)
    .single();

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const activar = usuario.estado === "INACTIVO";

  await admin
    .from("usuarios")
    .update({ estado: activar ? "ACTIVO" : "INACTIVO" })
    .eq("id_usuario", userId);

  await admin.auth.admin.updateUserById(usuario.auth_user_id, {
    ban_duration: activar ? "none" : "876000h",
  });

  return NextResponse.json({ ok: true });
}
