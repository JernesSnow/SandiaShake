import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function GET() {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("servicios_catalogo")
      .select("id_servicio, nombre, precio_publico")
      .eq("estado", "ACTIVO")
      .order("nombre");

    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
    });

  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      { error: e?.message ?? "Error cargando servicios" },
      { status: 500 }
    );
  }
}