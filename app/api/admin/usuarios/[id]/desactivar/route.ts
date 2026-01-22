import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function toBigIntId(raw: string) {
  const s = (raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await ctx.params; 
    const idUsuario = toBigIntId(id);

    if (!idUsuario) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    //Sesión
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    //Perfil del solicitante
    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, admin_nivel, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) {
      return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    }
    if (!perfil) {
      return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    }
    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }
    if (perfil.rol !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    //Para evitar que un usuario se desactive a sí mismo
    if (BigInt(perfil.id_usuario) === idUsuario) {
      return NextResponse.json(
        { error: "No puedes desactivarte a ti mismo." },
        { status: 400 }
      );
    }

    //Soft delete estado -> INACTIVO
    const admin = createSupabaseAdmin();
    const { error: updErr } = await admin
      .from("usuarios")
      .update({
        estado: "INACTIVO",
        updated_by: perfil.id_usuario,
      })
      .eq("id_usuario", idUsuario);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno desactivando usuario" },
      { status: 500 }
    );
  }
}
