import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
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

  const { data, error } = await admin
    .from("organizacion_usuario")
    .select("id_organizacion, organizaciones(nombre)")
    .eq("id_usuario_cliente", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const organizaciones = (data ?? [])
    .map((r: any) => r.organizaciones?.nombre)
    .filter(Boolean);

  return NextResponse.json({ organizaciones });
}
