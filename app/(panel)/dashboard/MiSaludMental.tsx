"use client";

import { Smile, Meh, Frown, HelpCircle } from "react-feather";

type EstadoAnimo = "ESTABLE" | "ATENTO" | "EN_RIESGO";

type Props = {
  estadoAnimo: EstadoAnimo | null;
  puntaje?: number | null;
  fechaRevision?: string | null;
};

const CONFIG: Record<EstadoAnimo, { label: string; color: string; icon: React.ReactNode; mensaje: string }> = {
  ESTABLE: {
    label: "Estable",
    color: "#6cbe45",
    icon: <Smile size={28} />,
    mensaje: "Todo marcha bien. ¡Seguí así!",
  },
  ATENTO: {
    label: "Atento",
    color: "#facc15",
    icon: <Meh size={28} />,
    mensaje: "Vale la pena prestarle atención a cómo te sentís.",
  },
  EN_RIESGO: {
    label: "En riesgo",
    color: "#ee2346",
    icon: <Frown size={28} />,
    mensaje: "No estás solo/a. Considerá hablar con tu equipo.",
  },
};

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CR", { day: "numeric", month: "long" });
}

export default function MiSaludMental({ estadoAnimo, puntaje, fechaRevision }: Props) {
  const cfg = estadoAnimo ? CONFIG[estadoAnimo] : null;

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6">
      <h2 className="font-semibold text-[var(--ss-text)] mb-0.5">Mi salud mental</h2>
      <p className="text-xs text-[var(--ss-text3)] mb-5">Tu último registro de bienestar.</p>

      {!cfg ? (
        <div className="h-32 flex flex-col items-center justify-center gap-2 text-[var(--ss-text3)] text-sm text-center">
          <HelpCircle size={28} />
          <span>Aún no tenés un registro de bienestar.</span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div
            className="shrink-0 rounded-xl p-4 flex items-center justify-center"
            style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
          >
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            <p className="text-xs text-[var(--ss-text3)] mt-0.5 leading-snug">{cfg.mensaje}</p>
            {fechaRevision && (
              <p className="text-[11px] text-[var(--ss-text3)] mt-2">
                Registrado el {formatFecha(fechaRevision)}
                {typeof puntaje === "number" ? ` · Puntaje ${puntaje}/5` : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
