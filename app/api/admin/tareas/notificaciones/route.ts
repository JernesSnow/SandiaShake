import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getRejectionAlertEmailHTML } from "@/lib/emails/rejection-alert-template";

const resendApiKey = process.env.RESEND_API_KEY ?? "";
const resend = new Resend(resendApiKey);

type NotificationPayload = {
  id_tarea?: number;
};

type TareaNotificacion = {
  id: number;
  payload: NotificationPayload | null;
  event_type: string;
  status: string;
  created_at?: string;
};

type Tarea = {
  id_tarea: number;
  titulo: string | null;
  id_colaborador: number | null;
  id_organizacion: number | null;
};

type UsuarioCorreo = {
  correo: string | null;
  nombre: string | null;
};

type Organizacion = {
  nombre: string | null;
};

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function processTaskNotifications() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Falta configurar RESEND_API_KEY");
  }

  const admin = createSupabaseAdmin();

  const { data: events, error } = await admin
    .from("tareas_notificaciones")
    .select("*")
    .eq("status", "PENDING")
    .eq("event_type", "TWO_CONSECUTIVE_REJECTIONS_CHAT")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  const notifications = (events ?? []) as TareaNotificacion[];

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const ev of notifications) {
    try {
      const { data: claimed, error: markProcessingError } = await admin
        .from("tareas_notificaciones")
        .update({
          status: "PROCESSING",
          last_error: null,
        })
        .eq("id", ev.id)
        .eq("status", "PENDING")
        .select("id")
        .maybeSingle();

      if (markProcessingError) {
        throw new Error(markProcessingError.message);
      }

      if (!claimed) {
        continue;
      }

      processed++;

      const payload = ev.payload ?? {};
      const tareaId = Number(payload.id_tarea);

      if (!Number.isFinite(tareaId)) {
        throw new Error("El payload no contiene un id_tarea válido");
      }

      const { data: tarea, error: tareaErr } = await admin
        .from("tareas")
        .select("id_tarea,titulo,id_colaborador,id_organizacion")
        .eq("id_tarea", tareaId)
        .maybeSingle<Tarea>();

      if (tareaErr) {
        throw new Error(tareaErr.message);
      }

      if (!tarea) {
        throw new Error("No se encontró la tarea");
      }

      const { data: colaborador, error: colabErr } = await admin
        .from("usuarios")
        .select("correo,nombre")
        .eq("id_usuario", tarea.id_colaborador)
        .eq("estado", "ACTIVO")
        .maybeSingle<UsuarioCorreo>();

      if (colabErr) {
        throw new Error(colabErr.message);
      }

      const { data: admins, error: adminsErr } = await admin
        .from("usuarios")
        .select("correo,nombre")
        .eq("rol", "ADMIN")
        .eq("estado", "ACTIVO");

      if (adminsErr) {
        throw new Error(adminsErr.message);
      }

      const { data: organizacion, error: orgErr } = await admin
        .from("organizaciones")
        .select("nombre")
        .eq("id_organizacion", tarea.id_organizacion)
        .maybeSingle<Organizacion>();

      if (orgErr) {
        throw new Error(orgErr.message);
      }

      const destinatarios = new Set<string>();

      if (colaborador?.correo) {
        destinatarios.add(colaborador.correo);
      }

      for (const adminItem of (admins ?? []) as UsuarioCorreo[]) {
        if (adminItem?.correo) {
          destinatarios.add(adminItem.correo);
        }
      }

      if (destinatarios.size === 0) {
        throw new Error("No hay destinatarios válidos");
      }

      const now = new Date().toISOString();

      const { error: emailError } = await resend.emails.send({
        from: "Sandía Shake <noreply@thegreatestdev.org>",
        to: [...destinatarios],
        subject: "⚠️ Alerta: contenido rechazado 2 veces seguidas",
        html: getRejectionAlertEmailHTML({
          colaboradorNombre: colaborador?.nombre ?? "equipo",
          tareaTitulo: tarea.titulo ?? `Tarea #${tarea.id_tarea}`,
          organizacionNombre: organizacion?.nombre ?? null,
        }),
      });

      if (emailError) {
        throw new Error(emailError.message);
      }

      const { error: updateErr } = await admin
        .from("tareas_notificaciones")
        .update({
          status: "SENT",
          sent_at: now,
          last_error: null,
        })
        .eq("id", ev.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      sent++;
    } catch (err: unknown) {
      failed++;

      const message =
        err instanceof Error ? err.message : String(err ?? "Error desconocido");

      await admin
        .from("tareas_notificaciones")
        .update({
          status: "FAILED",
          last_error: message,
        })
        .eq("id", ev.id);
    }
  }

  return {
    ok: true,
    processed,
    sent,
    failed,
  };
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processTaskNotifications();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}