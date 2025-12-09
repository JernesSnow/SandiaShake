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

function getColor(score: number) {
  if (score >= 85) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export default function RendimientoEquipo() {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow">
      <h2 className="text-white font-semibold mb-4">Rendimiento del equipo</h2>

      <div className="max-h-64 overflow-y-auto pr-2 dark-scroll">

        <div className="space-y-4 text-sm text-gray-300">

          {sorted.map((colab, idx) => (
            <div key={idx} className="pb-1">
              <div className="flex justify-between">
                <span>{colab.name}</span>
                <span
                  className={
                    colab.score >= 85
                      ? "text-green-400"
                      : colab.score >= 60
                      ? "text-yellow-400"
                      : "text-red-400"
                  }
                >
                  {colab.score}%
                </span>
              </div>

              <div className="w-full bg-gray-700 h-2 rounded">
                <div
                  className={`${getColor(colab.score)} h-2 rounded`}
                  style={{ width: colab.score + "%" }}
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
    background: #555;
    border-radius: 10px;
  }
  .dark-scroll::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
`}</style>
    </div>
  );
}
