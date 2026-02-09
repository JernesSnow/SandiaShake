"use client";

import { Database } from "react-feather";



type Props = {
  dbProvider: string;
  setDbProvider: (v: string) => void;
  dbRealtime: boolean;
  setDbRealtime: (v: boolean) => void;
  dbRlsEnabled: boolean;
  setDbRlsEnabled: (v: boolean) => void;
};



export default function DatabaseSection({
  dbProvider,
  setDbProvider,
  dbRealtime,
  setDbRealtime,
  dbRlsEnabled,
  setDbRlsEnabled,
}: Props) {
  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database size={18} className="text-[#6cbe45]" />
          Base de datos
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Proveedor
            </label>
            <input
              value={dbProvider}
              onChange={(e) => setDbProvider(e.target.value)}
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
            />
            <p className="text-[11px] text-gray-400 mt-2">
              Recomendado: Supabase (PostgreSQL) por Auth + RLS + escalabilidad.
            </p>
          </div>

          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dbRealtime}
                onChange={(e) => setDbRealtime(e.target.checked)}
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Realtime habilitado
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dbRlsEnabled}
                onChange={(e) => setDbRlsEnabled(e.target.checked)}
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Row Level Security (RLS) habilitado
            </label>

            <p className="text-[11px] text-gray-400">
              RLS: asegura que cada rol solo vea lo permitido (mínimo privilegio).
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => alert("Guardar DB (pendiente)")}
            className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
          >
            Guardar base de datos
          </button>
        </div>
      </div>
    </div>
  );
}
