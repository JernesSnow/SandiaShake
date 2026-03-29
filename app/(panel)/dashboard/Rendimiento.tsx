"use client";

type Colaborador = { nombre: string; score: number };

type Props = { colaboradores: Colaborador[] };

function barColor(score: number) {
  if (score >= 85) return "bg-[#6cbe45]";
  if (score >= 60) return "bg-[#facc15]";
  return "bg-[#ee2346]";
}

function textColor(score: number) {
  if (score >= 85) return "text-[#6cbe45]";
  if (score >= 60) return "text-[#facc15]";
  return "text-[#ee2346]";
}

export default function Rendimiento({ colaboradores }: Props) {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-[#fffef9] font-semibold mb-1">Rendimiento del equipo</h2>
      <p className="text-xs text-[#fffef9]/40 mb-4">% de tareas aprobadas por colaborador.</p>

      {colaboradores.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-[#fffef9]/30 text-sm">
          Sin colaboradores activos
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto pr-1 space-y-3 text-sm text-[#fffef9]/80 custom-scroll">
          {colaboradores.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className="truncate max-w-[70%]">{c.nombre}</span>
                <span className={"font-medium shrink-0 " + textColor(c.score)}>{c.score}%</span>
              </div>
              <div className="w-full bg-[#1f1f24] h-1.5 rounded-full border border-[#3a3a40]">
                <div
                  className={"h-1.5 rounded-full transition-all " + barColor(c.score)}
                  style={{ width: c.score + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #1f1f24; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #4a4748; border-radius: 10px; }
      `}</style>
    </div>
  );
}
