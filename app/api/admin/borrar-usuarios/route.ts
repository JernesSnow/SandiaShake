import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = { correos: string[] };

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    //Validar sesión
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    //Validar que sea ADMIN (y activo)
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = (await req.json()) as Body;
    const correos = (body.correos ?? [])
      .map((c) => (c ?? "").trim().toLowerCase())
      .filter(Boolean);

    if (correos.length === 0) {
      return NextResponse.json({ error: "Debes enviar correos[]" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    //Traer los usuarios desde la tabla para traer el auth_user_id
    const { data: rows, error: qErr } = await admin
      .from("usuarios")
      .select("id_usuario, correo, auth_user_id")
      .in("correo", correos);

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    const encontrados = rows ?? [];

    //Borrar perfiles en la DB
    const { error: delPerfilErr } = await admin
      .from("usuarios")
      .delete()
      .in("correo", correos);

    if (delPerfilErr) {
      return NextResponse.json({ error: delPerfilErr.message }, { status: 500 });
    }

    //Borrar usuarios de Auth
    const ids = encontrados.map((r) => r.auth_user_id).filter(Boolean) as string[];

    const erroresAuth: { id: string; error: string }[] = [];
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) erroresAuth.push({ id, error: error.message });
    }

    return NextResponse.json(
      {
        ok: true,
        borrados: correos,
        encontrados,
        erroresAuth,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
