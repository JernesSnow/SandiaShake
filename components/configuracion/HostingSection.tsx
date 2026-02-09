"use client";

import { Cloud } from "react-feather";



type Props = {
  hostingProvider: string;
  setHostingProvider: (v: string) => void;
  envMode: "Testing" | "Production";
  setEnvMode: (v: "Testing" | "Production") => void;
};



export default function HostingSection({
  hostingProvider,
  setHostingProvider,
  envMode,
  setEnvMode,
}: Props) {
  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Cloud size={18} className="text-[#7dd3fc]" />
          Hosting
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Proveedor
            </label>
            <input
              value={hostingProvider}
              onChange={(e) => setHostingProvider(e.target.value)}
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
            />
            <p className="text-[11px] text-gray-400 mt-2">
              Sugerido: Railway para test y prod con despliegue por ramas.
            </p>
          </div>

          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Entorno activo
            </label>
            <select
              value={envMode}
              onChange={(e) =>
                setEnvMode(e.target.value as "Testing" | "Production")
              }
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
            >
              <option value="Testing">Testing</option>
              <option value="Production">Production</option>
            </select>

            <p className="text-[11px] text-gray-400 mt-2">
              Testing: rama de pruebas · Production: rama main.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => alert("Guardar hosting (pendiente)")}
            className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
          >
            Guardar hosting
          </button>
        </div>
      </div>
    </div>
  );
}
