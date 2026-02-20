import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getRejectionAlertEmailHTML } from "@/lib/emails/rejection-alert-template";

const resend = new Resend(process.env.RESEND_API_KEY);

async function processEmailOutbox() {
  const admin = createSupabaseAdmin();

  const { data: events, error } = await admin
    .from("email_outbox")
    .select("*")
    .eq("status", "PENDING")
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const ev of events ?? []) {
    processed++;

    try {
      const payload = ev.payload as { id_tarea?: number };
      const tareaId = Number(payload?.id_tarea);

      if (!Number.isFinite(tareaId)) {
        throw new Error("El payload no contiene un id_tarea válido");
      }

      const { data: tarea, error: tareaErr } = await admin
        .from("tareas")
        .select("id_tarea,titulo,id_colaborador,id_organizacion")
        .eq("id_tarea", tareaId)
        .maybeSingle();

      if (tareaErr) throw new Error(tareaErr.message);
      if (!tarea) throw new Error("No se encontró la tarea");

      const { data: colaborador, error: colabErr } = await admin
        .from("usuarios")
        .select("correo,nombre")
        .eq("id_usuario", tarea.id_colaborador)
        .eq("estado", "ACTIVO")
        .maybeSingle();

      if (colabErr) throw new Error(colabErr.message);

      const { data: admins, error: adminsErr } = await admin
        .from("usuarios")
        .select("correo,nombre")
        .eq("rol", "ADMIN")
        .eq("estado", "ACTIVO");

      if (adminsErr) throw new Error(adminsErr.message);

      const { data: organizacion, error: orgErr } = await admin
        .from("organizaciones")
        .select("nombre")
        .eq("id_organizacion", tarea.id_organizacion)
        .maybeSingle();

      if (orgErr) throw new Error(orgErr.message);

      const destinatarios = new Set<string>();

      if (colaborador?.correo) {
        destinatarios.add(colaborador.correo);
      }

      for (const a of admins ?? []) {
        if (a?.correo) {
          destinatarios.add(a.correo);
        }
      }

      if (destinatarios.size === 0) {
        throw new Error("No hay destinatarios válidos");
      }

      const { error: emailError } = await resend.emails.send({
        from: "Sandía con Chile <noreply@thegreatestdev.org>",
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
        .from("email_outbox")
        .update({
          status: "SENT",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", ev.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      sent++;
    } catch (err: any) {
      failed++;

      await admin
        .from("email_outbox")
        .update({
          status: "FAILED",
          last_error: String(err?.message ?? err),
        })
        .eq("id", ev.id);
    }
  }

  return { ok: true, processed, sent, failed };
}

export async function POST() {
  try {
    const result = await processEmailOutbox();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await processEmailOutbox();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}