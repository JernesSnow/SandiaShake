import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const body = await req.json();

  const { error } = await admin
    .from("usuarios")
    .update({
      nombre: body.nombre,
      correo: body.correo,
      rol: body.rol,
      admin_nivel: body.admin_nivel ?? null,
      estado: body.estado,
    })
    .eq("id_usuario", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
