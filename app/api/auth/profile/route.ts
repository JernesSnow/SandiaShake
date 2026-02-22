export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No session" },
        { status: 401 }
      );
    }

    const { data: perfil, error } = await admin
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    let organizacion = null;

    if (perfil.rol === "CLIENTE") {
      const { data: orgLink } = await admin
        .from("organizacion_usuario")
        .select("id_organizacion, organizaciones(nombre)")
        .eq("id_usuario_cliente", perfil.id_usuario)
        .limit(1)
        .maybeSingle();

      if (orgLink?.id_organizacion) {
        organizacion = {
          id_organizacion: orgLink.id_organizacion,
          nombre: orgLink.organizaciones?.nombre ?? null,
        };
      }
    }

    return NextResponse.json({
      id_usuario: perfil.id_usuario,
      rol: perfil.rol,
      estado: perfil.estado,
      organizacion,
    });

  } catch (e: any) {
    console.error("PROFILE ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}