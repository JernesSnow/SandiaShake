"use client";

import type { FeatureKey } from "@/game/types";

const titles: Record<FeatureKey, string> = {
  demo: "Demo SandíaShake",
  organizacion: "Organización",
  seguimiento: "Seguimiento",
  crecimiento: "Crece con nosotros",
};

export function FeatureModal({
  open,
  feature,
  onClose,
}: {
  open: boolean;
  feature: FeatureKey | null;
  onClose: () => void;
}) {
  if (!open || !feature) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="font-semibold">{titles[feature]}</div>
          <button className="text-sm px-3 py-1 rounded-lg border" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="aspect-video w-full rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
            Aquí va el video (MP4) o demo
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-black text-white">
              Ver demo completa
            </button>
            <button className="px-4 py-2 rounded-xl border">
              Comenzar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}