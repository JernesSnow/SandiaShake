"use client";

import dynamic from "next/dynamic";
import type { FeatureKey } from "@/game/types";

const PhaserCanvas = dynamic(() => import("./PhaserCanvas"), { ssr: false });

export default function GameExperience({
  onFeature,
  modalOpen,
  onReady,
}: {
  onFeature: (k: FeatureKey) => void;
  modalOpen: boolean;
  onReady?: () => void;
}) {
  return (
    <div className="w-full">
      <div className="w-full h-screen overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <PhaserCanvas
            onFeature={onFeature}
            modalOpen={modalOpen}
            onReady={onReady}
          />
        </div>

        <div className="px-3 py-2 text-xs text-neutral-600 border-t bg-white/80">
          Usa flechas para moverte (desktop). Acércate a una estación y presiona Enter.
        </div>
      </div>
    </div>
  );
}