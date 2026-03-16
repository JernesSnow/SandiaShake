"use client";

export default function ChilliPoints() {
  const total = 820;
  const canjeados = 560;

  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-white font-semibold mb-4">Chilli Points</h2>

      <div className="text-sm text-gray-300 space-y-2">
        <div className="flex justify-between">
          <span>Total otorgados</span>
          <span className="text-white font-semibold">{total}</span>
        </div>

        <div className="flex justify-between">
          <span>Canjeados</span>
          <span className="text-blue-400 font-semibold">{canjeados}</span>
        </div>

        <div className="flex justify-between">
          <span>Disponibles</span>
          <span className="text-green-400 font-semibold">{total - canjeados}</span>
        </div>

        <div className="w-full bg-gray-700 h-2 rounded mt-3">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${(canjeados / total) * 100}%` }}
          />
        </div>

        <p className="text-xs text-gray-500">
          {(canjeados / total * 100).toFixed(0)}% canjeados.
        </p>
      </div>
    </div>
  );
}
