"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const entregablesData = [
  { name: "Aprobados", value: 8 },
  { name: "Pendientes", value: 4 },
  { name: "Rechazados", value: 2 },
];

export default function EntregablesChart() {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-white font-semibold mb-4">Entregables</h2>
      <p className="text-xs text-gray-400 mb-4">Progreso de entregables.</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entregablesData}>
            <XAxis dataKey="name" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip />
            <Bar dataKey="value" fill="#00c67a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
