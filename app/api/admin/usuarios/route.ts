import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // ✅ SAFE auth read (no crash if session is not ready yet)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 🔐 Read requester profile (RLS-safe)
    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) {
      return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    }

    if (!perfil) {
      return NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      );
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      );
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      );
    }

    const isPrimaryAdmin = perfil.admin_nivel === "PRIMARIO";

    // 🔓 Service-role query
    const admin = createSupabaseAdmin();
    let query = admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, rol, admin_nivel, estado, created_at")
      .order("id_usuario", { ascending: true });

    // 🚫 SECONDARY admins cannot see PRIMARY admins
    if (!isPrimaryAdmin) {
      query = query.not("admin_nivel", "eq", "PRIMARIO");
    }

    const { data: usuarios, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ usuarios: usuarios ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
