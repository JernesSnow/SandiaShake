"use client";

type Colaborador = { nombre: string; score: number };
type Props = { colaboradores: Colaborador[] };

function barColor(score: number) {
  if (score >= 85) return "#6cbe45";
  if (score >= 60) return "#facc15";
  return "#ee2346";
}

export default function Rendimiento({ colaboradores }: Props) {
  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6">
      <h2 className="font-semibold text-[var(--ss-text)] mb-0.5">Rendimiento del equipo</h2>
      <p className="text-xs text-[var(--ss-text3)] mb-5">% de tareas aprobadas por colaborador.</p>

      {colaboradores.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-[var(--ss-text3)] text-sm">
          Sin colaboradores activos
        </div>
      ) : (
        <div
          className="max-h-64 overflow-y-auto pr-1 space-y-3.5 text-sm"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--ss-border) transparent",
          }}
        >
          {colaboradores.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <span className="truncate max-w-[70%] text-[var(--ss-text2)]">{c.nombre}</span>
                <span
                  className="font-semibold shrink-0 tabular-nums text-xs"
                  style={{ color: barColor(c.score) }}
                >
                  {c.score}%
                </span>
              </div>
              <div className="w-full bg-[var(--ss-raised)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: c.score + "%", backgroundColor: barColor(c.score) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
