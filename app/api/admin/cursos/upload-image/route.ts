export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "course-images";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios").select("rol, estado, id_usuario").eq("auth_user_id", user.id).maybeSingle();
  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  return { perfil };
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function POST(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const oldUrl = form.get("oldUrl") as string | null;

    if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Formato no permitido. Usá PNG, JPG o WEBP." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "La imagen no puede superar 5MB." }, { status: 400 });

    const admin = createSupabaseAdmin();
    const path = `${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);

    if (oldUrl) {
      const oldPath = pathFromPublicUrl(oldUrl);
      if (oldPath) admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }

    return NextResponse.json({ url: publicData.publicUrl, path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
