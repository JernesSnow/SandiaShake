"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  estable: number;
  atento: number;
  enRiesgo: number;
  sinRegistro: number;
};

const LEGEND = [
  { label: "Estable",      color: "#6cbe45" },
  { label: "Atento",       color: "#facc15" },
  { label: "En riesgo",    color: "#ee2346" },
  { label: "Sin registro", color: "#94a3b8" },
];

export default function SaludMental({ estable, atento, enRiesgo, sinRegistro }: Props) {
  const raw = [
    { name: "Estable",      value: estable,     color: "#6cbe45" },
    { name: "Atento",       value: atento,      color: "#facc15" },
    { name: "En riesgo",    value: enRiesgo,    color: "#ee2346" },
    { name: "Sin registro", value: sinRegistro, color: "#94a3b8" },
  ];

  const data = raw.filter((d) => d.value > 0);
  const total = estable + atento + enRiesgo + sinRegistro;

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6">
      <h2 className="font-semibold text-[var(--ss-text)] mb-0.5">Salud mental del equipo</h2>
      <p className="text-xs text-[var(--ss-text3)] mb-4">
        Estado emocional de {total} colaborador{total !== 1 ? "es" : ""}.
      </p>

      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-[var(--ss-text3)] text-sm">
          Sin datos de bienestar
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="h-52 flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((item, i) => (
                    <Cell key={i} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--ss-raised)",
                    border: "1px solid var(--ss-border)",
                    borderRadius: 12,
                    color: "var(--ss-text)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* custom legend */}
          <div className="shrink-0 space-y-2.5 text-sm">
            {LEGEND.map((l) => {
              const item = raw.find((r) => r.label === l.label) ?? raw.find((r) => r.name === l.label);
              const val  = raw.find((r) => r.name === l.label)?.value ?? 0;
              return (
                <div key={l.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-[var(--ss-text2)] text-xs">{l.label}</span>
                  <span className="text-[var(--ss-text)] text-xs font-semibold tabular-nums ml-1">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
