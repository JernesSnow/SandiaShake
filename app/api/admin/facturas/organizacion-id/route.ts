import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

export async function GET(req: Request) {
  try {
    // 🔐 Auth
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const idOrganizacion = Number(
      url.searchParams.get("id_organizacion") || 0
    );

    if (!idOrganizacion) {
      return NextResponse.json(
        { error: "id_organizacion requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("facturas")
      .select(`
        id_factura,
        id_organizacion,
        periodo,
        total,
        saldo,
        estado_factura,
        fecha_vencimiento,
        created_at
      `)
      .eq("estado", "ACTIVO")
      .eq("id_organizacion", idOrganizacion)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, facturas: data ?? [] },
      { status: 200 }
    );

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}