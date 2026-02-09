"use client";

import { Link as LinkIcon } from "react-feather";



type Props = {
  driveEnabled: boolean;
  setDriveEnabled: (v: boolean) => void;
  driveFolderBase: string;
  setDriveFolderBase: (v: string) => void;
};



export default function GoogleDriveSection({
  driveEnabled,
  setDriveEnabled,
  driveFolderBase,
  setDriveFolderBase,
}: Props) {
  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <LinkIcon size={18} className="text-[#7dd3fc]" />
          Google Drive
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={driveEnabled}
                onChange={(e) => setDriveEnabled(e.target.checked)}
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Habilitar integración con Google Drive
            </label>

            <p className="text-[11px] text-gray-400 mt-2">
              Si está deshabilitado, no se mostrará el link del folder en
              tareas/entregables.
            </p>
          </div>

          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Carpeta base (link)
            </label>
            <input
              type="url"
              value={driveFolderBase}
              onChange={(e) => setDriveFolderBase(e.target.value)}
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => alert("Guardar Google Drive (pendiente)")}
            className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
          >
            Guardar Google Drive
          </button>
        </div>
      </div>
    </div>
  );
}
