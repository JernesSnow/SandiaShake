import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  nombre?: string;
  correo?: string;
  rol?: "ADMIN" | "COLABORADOR" | "CLIENTE";
  admin_nivel?: "PRIMARIO" | "SECUNDARIO" | null;
  estado?: "ACTIVO" | "INACTIVO";
};

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const idStr = ctx.params.id;

    if (!idStr || !/^\d+$/.test(idStr)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = (await req.json()) as Body;

    const patch: any = {};
    if (typeof body.nombre === "string") patch.nombre = body.nombre.trim();
    if (typeof body.correo === "string") patch.correo = body.correo.trim().toLowerCase();
    if (body.rol) patch.rol = body.rol;
    if (body.estado) patch.estado = body.estado;

    if (body.rol === "ADMIN") patch.admin_nivel = body.admin_nivel ?? "SECUNDARIO";
    if (body.rol && body.rol !== "ADMIN") patch.admin_nivel = null;

    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("usuarios")
      .update(patch)
      .eq("id_usuario", idStr);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
