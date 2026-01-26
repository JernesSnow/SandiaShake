import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PostBody = {
  nombre: string;
  correo: string;
  telefono?: string | null;
};

function cleanEmail(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, estado")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("usuarios")
      .select("id_usuario, nombre, correo, estado, created_at")
      .eq("rol", "COLABORADOR")
      .order("id_usuario", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ colaboradores: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno listando colaboradores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, admin_nivel, estado, id_usuario")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!perfil) return NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 });
    if (perfil.estado !== "ACTIVO") return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    if (perfil.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = (await req.json()) as PostBody;
    const nombre = (body.nombre ?? "").trim();
    const correo = cleanEmail(body.correo);

    if (!nombre || !correo) {
      return NextResponse.json({ error: "Nombre y correo son obligatorios" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    //Si ya existe en public.usuarios, reactivar en vez de insertar
    const { data: existente, error: exErr } = await admin
      .from("usuarios")
      .select("id_usuario, estado, auth_user_id, rol")
      .eq("correo", correo)
      .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

    if (existente) {
      if (existente.rol !== "COLABORADOR") {
        return NextResponse.json({ error: "Ese correo ya existe con otro rol en usuarios." }, { status: 409 });
      }

      //Reactivar si estaba INACTIVO
      if (existente.estado !== "ACTIVO") {
        const { error: upErr } = await admin
          .from("usuarios")
          .update({
            nombre,
            estado: "ACTIVO",
            updated_by: perfil.id_usuario,
          })
          .eq("id_usuario", existente.id_usuario);

        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

        return NextResponse.json({ ok: true, mensaje: "Colaborador reactivado." }, { status: 200 });
      }

      return NextResponse.json({ error: "Ese correo ya existe en usuarios." }, { status: 409 });
    }

    //Invitar en Supabase Auth
    const origin = req.headers.get("origin") ?? "";
    const redirectTo = origin ? `${origin}/invite` : undefined;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(correo, {
      redirectTo,
    });

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

    const authUserId = invited.user?.id;
    if (!authUserId) {
      return NextResponse.json({ error: "No se obtuvo auth_user_id del invitado" }, { status: 500 });
    }

    //Insertar perfil
    const { error: insErr } = await admin.from("usuarios").insert({
      nombre,
      correo,
      rol: "COLABORADOR",
      admin_nivel: null,
      estado: "ACTIVO",
      auth_user_id: authUserId,
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
    });

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, mensaje: "Invitación enviada y colaborador creado." }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno creando colaborador" }, { status: 500 });
  }
}
