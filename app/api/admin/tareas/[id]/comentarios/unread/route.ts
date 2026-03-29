import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    /* -------------------------
       Get authenticated user
    -------------------------- */

    const { data: auth, error: authErr } = await supabase.auth.getUser();

    if (authErr || !auth?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    /* -------------------------
       Get internal profile
    -------------------------- */

    const { data: perfil, error: perfilErr } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (perfilErr) {
      console.error("Perfil error:", perfilErr);

      return NextResponse.json(
        { error: "Error cargando perfil" },
        { status: 500 }
      );
    }

    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 403 }
      );
    }

    /* -------------------------
       Count unread comments
    -------------------------- */

    const { count, error: cErr } = await admin
      .from("tarea_comentarios")
      .select("id_comentario", { count: "exact", head: true })
      .eq("estado", "ACTIVO");

    if (cErr) {
      console.error("Comentarios error:", cErr);

      return NextResponse.json(
        { error: "Error cargando comentarios" },
        { status: 500 }
      );
    }

    const unread = count ?? 0;

    /* -------------------------
       Response expected by KanbanBoard
    -------------------------- */

    return NextResponse.json(
      {
        ok: true,
        unread,
        total: unread,
        read: 0,
      },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Unread endpoint error:", e);

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}