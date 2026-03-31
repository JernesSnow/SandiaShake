import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {

  try {

    const supabase = await createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Body inválido" },
        { status: 400 }
      );
    }

    const id_canje = Number(body.id_canje);

    if (!Number.isFinite(id_canje)) {
      return NextResponse.json(
        { error: "id_canje requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("canje_premio")
      .update({
        estado: "INACTIVO",
        updated_at: new Date().toISOString()
      })
      .eq("id_canje", id_canje);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );

  } catch (e: any) {

    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );

  }
}