"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Props = {
  estable: number;
  atento: number;
  enRiesgo: number;
  sinRegistro: number;
};

export default function SaludMental({ estable, atento, enRiesgo, sinRegistro }: Props) {
  const raw = [
    { name: "Estable",      value: estable,     color: "#6cbe45" },
    { name: "Atento",       value: atento,      color: "#facc15" },
    { name: "En riesgo",    value: enRiesgo,    color: "#ee2346" },
    { name: "Sin registro", value: sinRegistro, color: "#4a4748" },
  ];

  const data = raw.filter((d) => d.value > 0);
  const total = estable + atento + enRiesgo + sinRegistro;

  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-[#fffef9] font-semibold mb-1">Salud mental del equipo</h2>
      <p className="text-xs text-[#fffef9]/40 mb-4">
        Estado emocional de {total} colaborador{total !== 1 ? "es" : ""}.
      </p>

      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-[#fffef9]/30 text-sm">
          Sin datos de bienestar
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                {data.map((item, i) => (
                  <Cell key={i} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f1f24", border: "1px solid #4a474840", borderRadius: 8, color: "#fffef9", fontSize: 12 }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span style={{ color: "#fffef9", opacity: 0.7, fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
