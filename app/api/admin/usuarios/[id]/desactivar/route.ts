import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: user } = await admin
    .from("usuarios")
    .select("correo")
    .eq("id_usuario", Number(id))
    .single();

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const { error } = await admin
    .from("usuarios")
    .update({
      estado: "INACTIVO",
      correo: `__deleted__${Date.now()}__${user.correo}`,
    })
    .eq("id_usuario", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
