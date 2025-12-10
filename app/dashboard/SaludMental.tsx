"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const bienestarData = [
  { name: "Bien", value: 12, color: "#00c67a" },
  { name: "Regular", value: 5, color: "#f1c232" },
  { name: "Estrés", value: 2, color: "#ff4d4d" },
];

export default function SaludMentalPie() {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-white font-semibold mb-4">Salud mental de colaboradores</h2>
      <p className="text-xs text-gray-400 mb-4">
        Distribución del estado emocional del equipo.
      </p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bienestarData}
              innerRadius={40}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {bienestarData.map((item, index) => (
                <Cell key={index} fill={item.color} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{ backgroundColor: "#1e1e22", borderRadius: "8px", border: "none" }}
              itemStyle={{ color: "#fff" }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-gray-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
