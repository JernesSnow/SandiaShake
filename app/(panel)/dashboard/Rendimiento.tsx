"use client";

interface Collaborator {
  name: string;
  score: number;
}

const collaborators: Collaborator[] = [
  { name: "Diego Morales", score: 94 },
  { name: "Natalia Rivera", score: 72 },
  { name: "Ridiell Cruz", score: 40 },
  { name: "Carlos Méndez", score: 88 },
  { name: "Ana Rodríguez", score: 91 },
  { name: "Luis Navarro", score: 67 },
  { name: "Jimena Torres", score: 75 },
  { name: "Marco López", score: 53 },
  { name: "Paola Jiménez", score: 81 },
  { name: "Sofía Vargas", score: 60 },
];

const sorted = [...collaborators].sort((a, b) => b.score - a.score);

function getBarClasses(score: number) {
  if (score >= 85) return "bg-[#6cbe45]";
  if (score >= 60) return "bg-[#facc15]";
  return "bg-[#ee2346]";
}

function getTextClasses(score: number) {
  if (score >= 85) return "text-[#6cbe45]";
  if (score >= 60) return "text-[#facc15]";
  return "text-[#ee2346]";
}

export default function RendimientoEquipo() {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow-sm">
      <h2 className="text-[#fffef9] font-semibold mb-4">
        Rendimiento del equipo
      </h2>

      <div className="max-h-64 overflow-y-auto pr-2 dark-scroll">
        <div className="space-y-4 text-sm text-[#fffef9]/80">
          {sorted.map((colab, idx) => (
            <div key={idx} className="pb-1">
              <div className="flex justify-between mb-1">
                <span>{colab.name}</span>
                <span className={`font-medium ${getTextClasses(colab.score)}`}>
                  {colab.score}%
                </span>
              </div>

              <div className="w-full bg-[#1f1f23] h-2 rounded-full border border-[#3a3a40]">
                <div
                  className={`${getBarClasses(colab.score)} h-2 rounded-full transition-all`}
                  style={{ width: `${colab.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .dark-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .dark-scroll::-webkit-scrollbar-track {
          background: #1f1f23;
          border-radius: 10px;
        }
        .dark-scroll::-webkit-scrollbar-thumb {
          background: #4a4748;
          border-radius: 10px;
        }
        .dark-scroll::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}
