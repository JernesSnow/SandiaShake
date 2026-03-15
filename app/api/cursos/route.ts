import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cursos")
      .select("id_curso, titulo, subtitulo, descripcion, precio, image_id, chat_url, duracion_label, nivel, categoria, featured, visible")
      .eq("estado", "ACTIVO")
      .eq("visible", true)
      .order("featured", { ascending: false })
      .order("id_curso", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cursos: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
