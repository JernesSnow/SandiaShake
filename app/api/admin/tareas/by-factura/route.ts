import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, estado")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!perfil || perfil.estado !== "ACTIVO" || perfil.rol !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const url = new URL(req.url);
    const idFactura = url.searchParams.get("id_factura");

    if (!idFactura) {
      return NextResponse.json(
        { error: "id_factura es requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data, error: qErr } = await admin
      .from("tareas")
      .select(
        "id_tarea, titulo, status_kanban, prioridad, tipo_entregable"
      )
      .eq("id_factura", Number(idFactura))
      .neq("estado", "ELIMINADO")
      .order("id_tarea", { ascending: true });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
