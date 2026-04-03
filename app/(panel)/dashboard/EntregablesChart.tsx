"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = {
  aprobados: number;
  pendientes: number;
  rechazados: number;
};

export default function EntregablesChart({ aprobados, pendientes, rechazados }: Props) {
  const data = [
    { name: "Aprobados",  value: aprobados,  color: "#6cbe45" },
    { name: "Pendientes", value: pendientes, color: "#facc15" },
    { name: "Rechazados", value: rechazados, color: "#ee2346" },
  ];

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6">
      <h2 className="font-semibold text-[var(--ss-text)] mb-0.5">Entregables</h2>
      <p className="text-xs text-[var(--ss-text3)] mb-5">Estado de aprobación de entregables.</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--ss-raised)",
                border: "1px solid var(--ss-border)",
                borderRadius: 12,
                color: "var(--ss-text)",
                fontSize: 12,
              }}
              cursor={{ fill: "var(--ss-overlay)" }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
