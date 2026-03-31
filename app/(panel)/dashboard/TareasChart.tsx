"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = {
  pendientes: number;
  enProgreso: number;
  enRevision: number;
  atrasadas: number;
};

export default function TareasChart({ pendientes, enProgreso, enRevision, atrasadas }: Props) {
  const data = [
    { name: "Pendientes", value: pendientes,  color: "#fffef9" },
    { name: "En progreso", value: enProgreso, color: "#7dd3fc" },
    { name: "En revisión", value: enRevision, color: "#facc15" },
    { name: "Atrasadas",   value: atrasadas,  color: "#ee2346" },
  ];

  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-[#fffef9] font-semibold mb-1">Tareas</h2>
      <p className="text-xs text-[#fffef9]/40 mb-4">Estado actual de tareas activas.</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <XAxis dataKey="name" tick={{ fill: "#fffef9", fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#fffef9", fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f1f24", border: "1px solid #4a474840", borderRadius: 8, color: "#fffef9", fontSize: 12 }}
              cursor={{ fill: "#ffffff08" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
