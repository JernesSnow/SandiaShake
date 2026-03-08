import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// POST /api/cursos/comprar
// Records purchase intent in curso_organizacion and returns the WhatsApp chat URL.
// Payment gateway integration will replace/extend this later.
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr || !perfil) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
    }
    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    const body = await req.json();
    const id_curso = Number(body.id_curso);
    if (!Number.isFinite(id_curso) || id_curso <= 0) {
      return NextResponse.json({ error: "id_curso inválido" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Verify course exists and is active
    const { data: curso, error: cursoErr } = await admin
      .from("cursos")
      .select("id_curso, titulo, chat_url, precio")
      .eq("id_curso", id_curso)
      .eq("estado", "ACTIVO")
      .eq("visible", true)
      .maybeSingle();

    if (cursoErr || !curso) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    // Find client's organization if they have one
    let id_organizacion: number | null = null;
    if (perfil.rol === "CLIENTE") {
      const { data: orgLink } = await admin
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", perfil.id_usuario)
        .eq("estado", "ACTIVO")
        .maybeSingle();
      id_organizacion = orgLink?.id_organizacion ?? null;
    }

    // Record purchase intent
    if (id_organizacion) {
      await admin.from("curso_organizacion").upsert(
        {
          id_organizacion,
          id_curso,
          id_usuario: perfil.id_usuario,
          estado_pago: "PENDIENTE",
          estado: "ACTIVO",
          created_by: perfil.id_usuario,
          updated_by: perfil.id_usuario,
        },
        { onConflict: "id_organizacion,id_curso" }
      );
    }

    return NextResponse.json({
      ok: true,
      chat_url: curso.chat_url,
      titulo: curso.titulo,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
