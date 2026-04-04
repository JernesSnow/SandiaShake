import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function getTodayCR(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function daysUntilCR(dateString: string | null): number | null {
  if (!dateString) return null;

  const todayCR = getTodayCR();
  const today = new Date(`${todayCR}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("id_usuario, rol, estado, nombre")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilErr) {
      return NextResponse.json({ error: perfilErr.message }, { status: 500 });
    }

    if (!perfil || perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 403 });
    }

    if (perfil.rol !== "COLABORADOR") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("tareas")
      .select(`
        id_tarea,
        titulo,
        descripcion,
        status_kanban,
        prioridad,
        fecha_entrega,
        id_organizacion,
        organizaciones!fk_tareas_organizacion (
          nombre
        )
      `)
      .eq("id_colaborador", perfil.id_usuario)
      .eq("estado", "ACTIVO")
      .in("status_kanban", ["pendiente", "en_progreso"])
      .order("fecha_entrega", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tasks = (data ?? []).map((t: any) => {
      const dias_restantes = daysUntilCR(t.fecha_entrega);

      return {
        id_tarea: t.id_tarea,
        titulo: t.titulo,
        descripcion: t.descripcion,
        status_kanban: t.status_kanban,
        prioridad: t.prioridad,
        fecha_entrega: t.fecha_entrega,
        organizacion_nombre: t.organizaciones?.nombre ?? "—",
        dias_restantes,
      };
    });

    const response = {
      usuario: {
        id_usuario: perfil.id_usuario,
        nombre: perfil.nombre,
      },
      vence_hoy: tasks.filter((t) => t.dias_restantes === 0),
      vence_1: tasks.filter((t) => t.dias_restantes === 1),
      vence_2: tasks.filter((t) => t.dias_restantes === 2),
      vence_5: tasks.filter((t) => t.dias_restantes === 5),
      pendientes: tasks.filter((t) => t.status_kanban === "pendiente"),
      en_progreso: tasks.filter((t) => t.status_kanban === "en_progreso"),
    };

    return NextResponse.json({ ok: true, data: response });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}