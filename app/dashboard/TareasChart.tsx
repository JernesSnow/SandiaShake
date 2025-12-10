"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const tareasData = [
  { name: "Activas", value: 14 },
  { name: "Semana", value: 5 },
  { name: "Atrasadas", value: 3 },
];

export default function TareasChart() {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-white font-semibold mb-4">Tareas</h2>
      <p className="text-xs text-gray-400 mb-4">Estado de tareas activas.</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tareasData}>
            <XAxis dataKey="name" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip />
            <Bar dataKey="value" fill="#5b8df6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
