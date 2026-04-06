"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureKey } from "@/game/types";
import GameExperience from "./GameExperience";
import { FeatureModal } from "./FeatureModal";
import { useRouter } from "next/navigation";

export default function LandingHero() {
  const router = useRouter();

  const [mode, setMode] = useState<"hero" | "map">("hero");
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<FeatureKey | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [transitioning, setTransitioning] = useState(false);
  const [shake, setShake] = useState(false);
  const [split, setSplit] = useState(false);

  const [showJuice, setShowJuice] = useState(false);
  const [juiceReveal, setJuiceReveal] = useState(false);

  const [mapMounted, setMapMounted] = useState(false);
  const [gameReady, setGameReady] = useState(false);

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const resetTransitionState = () => {
    setTransitioning(false);
    setShake(false);
    setSplit(false);
    setShowJuice(false);
    setJuiceReveal(false);
  };

  const startWatermelonTransition = () => {
    if (transitioning) return;

    setTransitioning(true);
    setGameReady(false);
    setShake(true);

    later(220, () => {
      setShake(false);
      setSplit(true);
    });

    later(430, () => {
      setShowJuice(true);
    });

    later(520, () => {
      setMapMounted(true);
      setMode("map");
    });
  };

  const handleGameReady = () => {
  if (gameReady) return;

  setGameReady(true);

  // pequeña pausa para que no se revele instantáneo al estar ready
  later(260, () => {
    setJuiceReveal(true);
  });

  // se limpia DESPUÉS de que termine de caer
  later(1700, () => {
    resetTransitionState();
  });
};

  const returnToHero = () => {
    setOpen(false);
    setFeature(null);
    setMode("hero");
    setMapMounted(false);
    setGameReady(false);
    resetTransitionState();
  };

  return (
    <main className="min-h-screen bg-neutral-50 relative overflow-hidden">
      {mapMounted && (
        <div className="fixed inset-0 z-10 bg-neutral-50">
          <GameExperience
  onFeature={(k) => {
    if ((k as any) === "exit") {
      returnToHero();
      return;
    }

    setFeature(k);
    setOpen(true);
  }}
  modalOpen={open}
  onReady={handleGameReady}
/>
        </div>
      )}

      {showJuice && (
  <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden">
    <div
      className={`absolute left-0 right-0 top-0 h-[130vh] ${
        juiceReveal
          ? "animate-[juiceCurtainFall_1.35s_cubic-bezier(0.22,1,0.36,1)_forwards]"
          : ""
      }`}
    >
      {/* masa roja que cubre la pantalla */}
      <div className="absolute left-0 right-0 top-0 bottom-[18vh] bg-[#d72638]" />

      {/* borde líquido ABAJO, no arriba */}
      <img
        src="/assets/jugo.png"
        alt="Transición de jugo"
        className="absolute left-1/2 bottom-[17vh] -translate-x-1/2 w-[120vw] max-w-none"
      />
    </div>
  </div>
)}

       {/* Header SIEMPRE visible */}
  <header className="relative z-30 mx-auto max-w-6xl px-5 py-5 flex items-center justify-between">
    <div className="font-bold text-black">Sandía con Chile</div>
    <div className="flex gap-2">
      <button
        className="px-4 py-2 rounded-xl bg-black text-white"
        onClick={() => router.push("/auth")}
      >
        Login
      </button>
      <button
        className="px-4 py-2 rounded-xl bg-black text-white"
        onClick={() => router.push("/signup")}
      >
        Get started
      </button>
    </div>
  </header>


      <div
        className={`relative z-20 transition-opacity duration-300 ${
          mode === "map" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        
        <section className="mx-auto max-w-6xl px-5 pb-12">
          <div className="grid md:grid-cols-2 gap-8 items-center min-h-[70vh]">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-black">
                Una forma más simple de mostrar SandíaShake.
              </h1>
              <p className="text-neutral-600">
                Haz click en la sandía para entrar a una demo interactiva.
              </p>
              <div className="flex gap-2">
                <button
                  className="px-5 py-3 rounded-2xl bg-black text-white"
                  onClick={startWatermelonTransition}
                  disabled={transitioning}
                >
                  Explorar demo
                </button>
                <button className="px-5 py-3 rounded-2xl bg-black text-white">
                  Contactar
                </button>
              </div>
              {isMobile && (
                <p className="text-xs text-neutral-500">
                  En móvil luego agregamos botones para ir a cada estación.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-72 h-72 flex items-center justify-center">
                {!split ? (
                  <button
                    className={`relative w-72 h-72 rounded-full bg-green-600 shadow-lg overflow-hidden ${
                      shake ? "animate-[wiggle_0.25s_ease-in-out]" : ""
                    } ${
                      transitioning ? "cursor-default" : "cursor-pointer"
                    }`}
                    onClick={startWatermelonTransition}
                    aria-label="Entrar a la demo"
                    disabled={transitioning}
                  >
                    <div className="absolute inset-6 rounded-full bg-red-500 opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-semibold z-10">
                      Click 🍉
                    </div>
                  </button>
                ) : (
                  <div className="relative w-72 h-72">
                    <div className="absolute left-1/2 top-1/2 w-32 h-56 -translate-y-1/2 -translate-x-[120%] rounded-l-full bg-red-500 border-[14px] border-green-600 rotate-[-12deg] shadow-lg" />
                    <div className="absolute left-1/2 top-1/2 w-32 h-56 -translate-y-1/2 translate-x-[20%] rounded-r-full bg-red-500 border-[14px] border-green-600 rotate-[12deg] shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <FeatureModal
        open={open}
        feature={feature}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}