// app/api/admin/organizaciones/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfil() {
  const supabase = await createSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!perfil) {
    return {
      error: NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      ),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  return { perfil };
}

export async function GET() {
  try {
    const { perfil, error } = await getPerfil();
    if (error) return error;

    const admin = createSupabaseAdmin();
    const rol = String(perfil!.rol ?? "").toUpperCase();

    const orgSelect = `
      id_organizacion,
      nombre,
      estado,
      pais,
      ciudad,
      canton,
      telefono,
      correo,
      descripcion,
      estado_pago_organizacion:estado_pago_organizacion (
        estado_cuenta,
        dias_mora
      ),
      tareas:tareas (
        id_tarea,
        id_colaborador,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        tipo_entregable,
        fecha_entrega,
        mes,
        estado,
        created_at
      )
    `;

    if (rol === "ADMIN") {
      const { data, error: qErr } = await admin
        .from("organizaciones")
        .select(orgSelect)
        .neq("estado", "ELIMINADO")
        .order("nombre", { ascending: true });

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }

      const normalized = (data ?? []).map((o: any) => ({
        ...o,
        tareas: Array.isArray(o?.tareas) ? o.tareas : [],
      }));

      return NextResponse.json({ ok: true, data: normalized }, { status: 200 });
    }

    if (rol === "COLABORADOR") {
      const { data, error: qErr } = await admin
        .from("asignacion_organizacion")
        .select(`
          id_asignacion,
          estado,
          organizaciones:organizaciones (
            ${orgSelect}
          )
        `)
        .eq("id_colaborador", perfil!.id_usuario)
        .eq("estado", "ACTIVO");

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }

      const mapped = (data ?? [])
        .map((r: any) => r.organizaciones)
        .filter((o: any) => o && o.estado !== "ELIMINADO")
        .map((o: any) => {
          const tareas = Array.isArray(o?.tareas) ? o.tareas : [];

          const tareasAsignadas = tareas.filter(
            (t: any) =>
              String(t?.id_colaborador ?? "") === String(perfil!.id_usuario) &&
              String(t?.estado ?? "") !== "ELIMINADO"
          );

          return {
            ...o,
            tareas: tareasAsignadas,
          };
        });

      const unique = Array.from(
        new Map(mapped.map((o: any) => [o.id_organizacion, o])).values()
      );

      unique.sort((a: any, b: any) =>
        String(a.nombre).localeCompare(String(b.nombre))
      );

      return NextResponse.json({ ok: true, data: unique }, { status: 200 });
    }

    if (rol === "CLIENTE") {
      const { data: links, error: lErr } = await admin
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", perfil!.id_usuario)
        .eq("estado", "ACTIVO");

      if (lErr) {
        return NextResponse.json({ error: lErr.message }, { status: 500 });
      }

      const orgIds = (links ?? [])
        .map((r: any) => Number(r.id_organizacion))
        .filter((n: any) => Number.isFinite(n));

      if (orgIds.length === 0) {
        return NextResponse.json({ ok: true, data: [] }, { status: 200 });
      }

      const { data, error: qErr } = await admin
        .from("organizaciones")
        .select(orgSelect)
        .in("id_organizacion", orgIds)
        .neq("estado", "ELIMINADO")
        .order("nombre", { ascending: true });

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }

      const normalized = (data ?? []).map((o: any) => ({
        ...o,
        tareas: Array.isArray(o?.tareas) ? o.tareas : [],
      }));

      return NextResponse.json({ ok: true, data: normalized }, { status: 200 });
    }

    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}