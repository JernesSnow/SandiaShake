"use client";

import { useEffect, useState } from "react";
import type { FeatureKey } from "@/game/types";
import GameExperience from "./GameExperience";
import { FeatureModal } from "./FeatureModal";

export default function LandingHero() {
  const [mode, setMode] = useState<"hero" | "map">("hero");
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<FeatureKey | null>(null);

  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mq = window.matchMedia("(max-width: 768px)");
  const update = () => setIsMobile(mq.matches);
  update();
  mq.addEventListener("change", update);
  return () => mq.removeEventListener("change", update);
}, []);

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between">
        <div className="font-bold">Sandía con Chile</div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl border">Login</button>
          <button className="px-4 py-2 rounded-xl bg-black text-white">Get started</button>
        </div>
      </header>

     <section
  className={
    mode === "map"
      ? "mx-auto w-full px-5 pb-12"
      : "mx-auto max-w-6xl px-5 pb-12"
  }
>
        {mode === "hero" ? (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Una forma más simple de mostrar SandíaShake.
              </h1>
              <p className="text-neutral-600">
                Haz click en la sandía para entrar a una demo interactiva.
              </p>
              <div className="flex gap-2">
                <button
                  className="px-5 py-3 rounded-2xl bg-black text-white"
                  onClick={() => setMode("map")}
                >
                  Explorar demo
                </button>
                <button className="px-5 py-3 rounded-2xl border">Contactar</button>
              </div>
              {isMobile && (
                <p className="text-xs text-neutral-500">
                  En móvil luego agregamos botones para ir a cada estación.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <button
                className="w-72 h-72 rounded-full bg-green-600 shadow-lg relative"
                onClick={() => setMode("map")}
                aria-label="Entrar a la demo"
              >
                <div className="absolute inset-6 rounded-full bg-red-500 opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
                  Click 🍉
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600">Demo interactiva</div>
              <button className="px-4 py-2 rounded-xl border" onClick={() => setMode("hero")}>
                Volver
              </button>
            </div>
            <div className="w-full">
            <GameExperience
              onFeature={(k) => {
                setFeature(k);
                setOpen(true);
              }}
                modalOpen={open}
            />
          </div>
        </div>
        )}
      </section>

      <FeatureModal
        open={open}
        feature={feature}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}