import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  nombre: string;
  correo: string;
  rol: "ADMIN" | "COLABORADOR";
  admin_nivel?: "PRIMARIO" | "SECUNDARIO" | null;
};

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

    const body = (await req.json()) as Body;
    const nombre = (body.nombre ?? "").trim();
    const correo = (body.correo ?? "").trim().toLowerCase();
    const rol = body.rol;
    const admin_nivel = body.admin_nivel ?? null;

    if (!nombre || !correo || !rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (rol === "ADMIN" && perfil.admin_nivel !== "PRIMARIO") {
      return NextResponse.json({ error: "Solo Admin PRIMARIO puede crear Admins." }, { status: 403 });
    }

    const admin = createSupabaseAdmin();

    //Evitar duplicado en public.usuarios
    const { data: existente } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("correo", correo)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ error: "Ese correo ya existe en usuarios." }, { status: 409 });
    }

    //Invitar
    const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(correo, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/invite`,
    });


    const authUserId = invited.user?.id;
    if (!authUserId) return NextResponse.json({ error: "No se obtuvo auth_user_id" }, { status: 500 });

    //Insert perfil
    const { error: insertErr } = await admin.from("usuarios").insert({
      nombre,
      correo,
      rol,
      admin_nivel: rol === "ADMIN" ? (admin_nivel ?? "SECUNDARIO") : null,
      estado: "ACTIVO",
      auth_user_id: authUserId,
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: "Invitación enviada y perfil creado." }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
  
}
