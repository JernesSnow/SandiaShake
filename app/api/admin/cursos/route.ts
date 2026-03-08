import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  return { perfil };
}

// GET /api/admin/cursos — list all courses (including hidden)
export async function GET() {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const { data, error: dbErr } = await admin
      .from("cursos")
      .select("id_curso, titulo, subtitulo, descripcion, precio, image_id, chat_url, duracion_label, nivel, categoria, featured, visible, estado")
      .eq("estado", "ACTIVO")
      .order("featured", { ascending: false })
      .order("id_curso", { ascending: true });

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
    return NextResponse.json({ cursos: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}

// POST /api/admin/cursos — create a new course
export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = await req.json();
    const { titulo, subtitulo, descripcion, precio, image_id, chat_url, duracion_label, nivel, categoria, featured, visible } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }
    if (!chat_url?.trim()) {
      return NextResponse.json({ error: "El link de WhatsApp es obligatorio" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data, error: dbErr } = await admin
      .from("cursos")
      .insert({
        titulo: titulo.trim(),
        subtitulo: subtitulo?.trim() || null,
        descripcion: descripcion?.trim() || null,
        precio: Number(precio) || 0,
        image_id: image_id || "1",
        chat_url: chat_url.trim(),
        duracion_label: duracion_label?.trim() || null,
        nivel: nivel || null,
        categoria: categoria || null,
        featured: !!featured,
        visible: visible !== false,
        estado: "ACTIVO",
        created_by: perfil!.id_usuario,
        updated_by: perfil!.id_usuario,
      })
      .select("id_curso, titulo, subtitulo, descripcion, precio, image_id, chat_url, duracion_label, nivel, categoria, featured, visible")
      .maybeSingle();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
    return NextResponse.json({ curso: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
