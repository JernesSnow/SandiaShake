"use client";

type Props = {
  totalGanados: number;
  totalCanjeados: number;
  disponibles: number;
};

export default function ChilliPoints({ totalGanados, totalCanjeados, disponibles }: Props) {
  const pct = totalGanados > 0 ? Math.round((totalCanjeados / totalGanados) * 100) : 0;

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 relative overflow-hidden">
      {/* decorative chilli */}
      <span className="absolute -right-2 -top-2 text-7xl opacity-10 select-none rotate-12 pointer-events-none">
        🌶
      </span>

      <h2 className="font-semibold text-[var(--ss-text)] mb-0.5 relative z-10">Chilli Points</h2>
      <p className="text-xs text-[var(--ss-text3)] mb-5 relative z-10">Resumen de puntos del equipo.</p>

      <div className="space-y-3 text-sm relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-[var(--ss-text2)]">Total ganados</span>
          <span className="text-[var(--ss-text)] font-semibold tabular-nums">🌶 {totalGanados}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ss-text2)]">Canjeados</span>
          <span className="font-semibold tabular-nums text-[#7dd3fc]">{totalCanjeados}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ss-text2)]">Disponibles</span>
          <span className="font-semibold tabular-nums text-[#6cbe45]">{disponibles}</span>
        </div>

        <div className="pt-2">
          <div className="flex justify-between text-xs text-[var(--ss-text3)] mb-1.5">
            <span>% canjeado</span>
            <span className="tabular-nums font-medium text-[var(--ss-text2)]">{pct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--ss-raised)] overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-500 bg-[#ee2346]"
              style={{ width: pct + "%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
