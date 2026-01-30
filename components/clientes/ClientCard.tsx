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
  if (score >= 85) return "bg-green-500";
  if (score >= 60) return "bg-yellow-400";
  return "bg-red-500";
}

function getTextClasses(score: number) {
  if (score >= 85) return "text-green-700";
  if (score >= 60) return "text-yellow-700";
  return "text-red-700";
}

export default function RendimientoEquipo() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h2 className="text-gray-900 font-semibold mb-4">
        Rendimiento del equipo
      </h2>

      <div className="max-h-64 overflow-y-auto pr-2 light-scroll">
        <div className="space-y-4 text-sm text-gray-700">
          {sorted.map((colab, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-800">
                  {colab.name}
                </span>
                <span className={`text-sm font-semibold ${getTextClasses(colab.score)}`}>
                  {colab.score}%
                </span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className={`${getBarClasses(colab.score)} h-2 rounded-full`}
                  style={{ width: `${colab.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .light-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .light-scroll::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        .light-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .light-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
