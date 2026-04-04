"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Task = {
  id_tarea: number;
  titulo: string;
  descripcion: string | null;
  status_kanban: string;
  prioridad: string;
  fecha_entrega: string | null;
  organizacion_nombre: string;
  dias_restantes: number | null;
};

type SummaryData = {
  usuario: {
    id_usuario: number;
    nombre: string;
  };
  vence_hoy: Task[];
  vence_1: Task[];
  vence_2: Task[];
  vence_5: Task[];
  pendientes: Task[];
  en_progreso: Task[];
};

function Section({
  title,
  subtitle,
  tasks,
}: {
  title: string;
  subtitle: string;
  tasks: Task[];
}) {
  return (
    <div className="rounded-xl border border-[#4a4748]/50 bg-[#333132] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-[#fffef9]/60">{subtitle}</p>

      {tasks.length === 0 ? (
        <div className="mt-3 rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] px-3 py-2 text-xs text-[#fffef9]/50">
          No hay tareas en esta sección.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {tasks.map((task) => (
            <div
              key={`${title}-${task.id_tarea}`}
              className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{task.titulo}</p>
                  <p className="text-[11px] text-[#fffef9]/60">
                    {task.organizacion_nombre}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-[#fffef9]/70">
                    {task.fecha_entrega ?? "Sin fecha"}
                  </p>
                  <p className="text-[11px] text-[#fffef9]/50">
                    Prioridad: {task.prioridad}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TareasPorHacerPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const notifRes = await fetch("/api/colaboradores/resumen-error");
        const notifJson = await notifRes.json();

        if (!notifRes.ok) {
          throw new Error(notifJson?.error || "No se pudo validar la notificación");
        }

        if (notifJson?.notification?.mensaje) {
          setErrorMessage(notifJson.notification.mensaje);
        }

        const resumenRes = await fetch("/api/colaboradores/tarea-resumen");
        const resumenJson = await resumenRes.json();

        if (!resumenRes.ok) {
          throw new Error(resumenJson?.error || "No se pudo cargar el resumen");
        }

        setSummary(resumenJson.data);

        if (notifJson?.notification?.id_notificacion) {
          await fetch("/api/colaboradores/marcar-leido", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_notificacion: notifJson.notification.id_notificacion,
            }),
           });
        }
      } catch (e: any) {
        setErrorMessage(e?.message ?? "Error cargando la página");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-[#fffef9]/70">
        Cargando resumen de tareas...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 text-[#fffef9]">
      <div className="rounded-xl border border-[#ee2346]/40 bg-[#ee2346]/10 p-4">
        <h1 className="text-lg font-semibold text-white">
          Resumen de tareas disponible en la plataforma
        </h1>
        <p className="mt-2 text-sm text-[#fffef9]/80">
          {errorMessage ||
            "No se pudo enviar tu resumen diario por correo. Puedes revisarlo aquí."}
        </p>
      </div>

      <div className="mt-4">
    <Link
      href="/dashboard"
      className="inline-flex items-center rounded-md bg-[#6cbe45] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5fa93d] transition"
    >
      Ir a mis tareas
    </Link>
  </div>

      {summary && (
        <>
          <Section
            title="Tareas que se vencen hoy"
            subtitle="Estas tareas requieren atención inmediata."
            tasks={summary.vence_hoy}
          />

          <Section
            title="Tareas que se vencen en 1 día"
            subtitle="Conviene priorizarlas cuanto antes."
            tasks={summary.vence_1}
          />

          <Section
            title="Tareas que se vencen en 2 días"
            subtitle="Estas tareas ya entran en seguimiento cercano."
            tasks={summary.vence_2}
          />

          <Section
            title="Tareas que se vencen en 5 días"
            subtitle="Tareas a monitorear para anticiparse."
            tasks={summary.vence_5}
          />

          <Section
            title="Tareas pendientes"
            subtitle="Tareas que aún no han iniciado."
            tasks={summary.pendientes}
          />

          <Section
            title="Tareas en progreso"
            subtitle="Tareas que ya están siendo trabajadas."
            tasks={summary.en_progreso}
          />
        </>
      )}
    </div>
  );
}