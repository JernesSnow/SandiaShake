"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
};

const SCORES = [0, 1, 2, 3, 4, 5];

// Gradient from red → orange → yellow → yellow-green → green
const SCORE_COLORS: Record<number, string> = {
  0: "#ee2346",
  1: "#f47216",
  2: "#f1c232",
  3: "#c7d629",
  4: "#8ecf35",
  5: "#6cbe45",
};

function HappyFace({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="10" cy="11" r="1.5" fill={color} />
      <circle cx="18" cy="11" r="1.5" fill={color} />
      <path d="M9 17 Q14 22 19 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function SadFace({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="10" cy="11" r="1.5" fill={color} />
      <circle cx="18" cy="11" r="1.5" fill={color} />
      <path d="M9 20 Q14 15 19 20" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function SaludMentalModal({ onClose }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bienestar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntaje: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Bienestar save error:", data);
        setError(data.error ?? "Error al guardar");
        setLoading(false);
        return;
      }
      onClose();
    } catch (err: any) {
      console.error("Bienestar fetch error:", err);
      setError("Error de conexión");
      setLoading(false);
    }
  }

  const activeColor = selected !== null ? SCORE_COLORS[selected] : "#6cbe45";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#2b2b30] border border-[#3a3a40] shadow-xl p-6 flex flex-col items-center gap-5">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-white font-semibold text-lg">¿Cómo te sentís hoy?</h2>
          <p className="text-gray-400 text-sm mt-1">
            De 0 a 5 — tu bienestar nos importa
          </p>
        </div>

        {/* Happy face at top */}
        <div className="flex flex-col items-center gap-3 w-full">
          <HappyFace color={selected !== null && selected >= 4 ? SCORE_COLORS[selected] : "#6cbe45"} />

          {/* Score buttons with gradient */}
          <div className="flex items-center gap-2 justify-center">
            {SCORES.map((n) => {
              const isSelected = selected === n;
              const color = SCORE_COLORS[n];
              return (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  style={{
                    backgroundColor: isSelected ? color : "transparent",
                    borderColor: color,
                    color: isSelected ? "#fff" : color,
                    transform: isSelected ? "scale(1.2)" : "scale(1)",
                  }}
                  className="w-10 h-10 rounded-full border-2 font-bold text-base transition-all duration-150 outline-none focus:ring-2 focus:ring-white/30"
                >
                  {n}
                </button>
              );
            })}
          </div>

          {/* Sad face at bottom */}
          <SadFace color={selected !== null && selected <= 1 ? SCORE_COLORS[selected] : "#ee2346"} />
        </div>

        {/* Label */}
        {selected !== null && (
          <p
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: activeColor }}
          >
            {selected === 0 && "Muy mal — gracias por compartirlo"}
            {selected === 1 && "Mal — lo tenemos en cuenta"}
            {selected === 2 && "Regular — esperamos que mejore"}
            {selected === 3 && "Bien — qué bueno escucharlo"}
            {selected === 4 && "Muy bien — nos alegra"}
            {selected === 5 && "Excelente — a darle al día!"}
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#3a3a40] text-gray-400 hover:text-white hover:border-gray-500 py-2 text-sm transition"
          >
            Omitir
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected === null || loading}
            style={{ backgroundColor: selected !== null ? activeColor : undefined }}
            className="flex-1 rounded-lg bg-[#6cbe45] disabled:bg-[#3a3a40] disabled:text-gray-500 text-white font-semibold py-2 text-sm transition-colors duration-200"
          >
            {loading ? "Guardando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
