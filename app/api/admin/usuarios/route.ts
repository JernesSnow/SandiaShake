// app/api/admin/usuarios/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const admin = createSupabaseAdmin();
    const { data: perfil, error: perfilErr } = await admin
      .from("usuarios")
      .select("id_usuario, rol, admin_nivel, estado, auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });

    const rol = String(perfil.rol ?? "").toUpperCase();
    const isAdmin = rol === "ADMIN";
    const isColab = rol === "COLABORADOR";
    const isCliente = rol === "CLIENTE";
    const isPrimaryAdmin = isAdmin && perfil.admin_nivel === "PRIMARIO";

    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: true,
          isAdmin: false,
          roleFlags: { isAdmin, isColab, isCliente },
          perfil: {
            id_usuario: perfil.id_usuario,
            rol: perfil.rol,
            admin_nivel: perfil.admin_nivel ?? null,
          },
          usuarios: [],
        },
        { status: 200 }
      );
    }

    let query = admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, rol, admin_nivel, estado, created_at")
      .order("id_usuario", { ascending: true });

    if (!isPrimaryAdmin) {
      query = query.not("admin_nivel", "eq", "PRIMARIO");
    }

    const { data: usuarios, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        isAdmin: true,
        roleFlags: { isAdmin, isColab, isCliente },
        perfil: {
          id_usuario: perfil.id_usuario,
          rol: perfil.rol,
          admin_nivel: perfil.admin_nivel ?? null,
        },
        usuarios: usuarios ?? [],
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}