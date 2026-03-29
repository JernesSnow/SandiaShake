"use client";

type Props = {
  totalGanados: number;
  totalCanjeados: number;
  disponibles: number;
};

export default function ChilliPoints({ totalGanados, totalCanjeados, disponibles }: Props) {
  const pct = totalGanados > 0 ? Math.round((totalCanjeados / totalGanados) * 100) : 0;

  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow relative overflow-hidden">
      {/* decorative chilli */}
      <span className="absolute -right-2 -top-2 text-7xl opacity-10 select-none rotate-12 pointer-events-none"></span>

      <h2 className="text-[#fffef9] font-semibold mb-1 relative z-10">Chilli Points</h2>
      <p className="text-xs text-[#fffef9]/40 mb-5 relative z-10">Resumen de puntos del equipo.</p>

      <div className="space-y-3 text-sm relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-[#fffef9]/60">Total ganados</span>
          <span className="text-[#fffef9] font-semibold">🌶 {totalGanados}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#fffef9]/60">Canjeados</span>
          <span className="text-[#7dd3fc] font-semibold">{totalCanjeados}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#fffef9]/60">Disponibles</span>
          <span className="text-[#6cbe45] font-semibold">{disponibles}</span>
        </div>

        <div className="pt-1">
          <div className="flex justify-between text-xs text-[#fffef9]/40 mb-1.5">
            <span>Canjeados</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#1f1f24] border border-[#3a3a40]">
            <div
              className="h-1.5 rounded-full bg-[#ee2346] transition-all"
              style={{ width: pct + "%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
