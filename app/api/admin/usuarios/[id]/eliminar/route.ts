// src/app/api/admin/usuarios/[id]/eliminar/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function parseBigintParam(id: string) {
  if (!id || id === "undefined" || id === "null") return null;
  if (!/^\d+$/.test(id)) return null;
  return id;
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const idStr = parseBigintParam(id);
    if (!idStr) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const supabase = await createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado, id_usuario")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const admin = createSupabaseAdmin();

    //Traer auth_user_id antes de borrar el perfil
    const { data: u, error: getErr } = await admin
      .from("usuarios")
      .select("auth_user_id, rol, admin_nivel")
      .eq("id_usuario", idStr)
      .maybeSingle();

    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
    if (!u) return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });

    //Para evita borrar al Admin Primario
    if (u.rol === "ADMIN" && u.admin_nivel === "PRIMARIO") {
      return NextResponse.json({ error: "No se puede eliminar el Admin PRIMARIO." }, { status: 403 });
    }

    const { error: delPerfilErr } = await admin.from("usuarios").delete().eq("id_usuario", idStr);
    if (delPerfilErr) return NextResponse.json({ error: delPerfilErr.message }, { status: 500 });

    if (u.auth_user_id) {
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(u.auth_user_id);
      if (delAuthErr) {
        // perfil ya fue borrado, auth falla por las reglas de Supabase, el usuario queda desactivado y ya no puede iniciar sesion pero sigue en la tabla de auth
        return NextResponse.json(
          { error: `Perfil borrado, pero Auth no se pudo borrar: ${delAuthErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
