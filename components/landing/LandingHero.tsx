"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureKey } from "@/game/types";
import GameExperience from "./GameExperience";
import { FeatureModal } from "./FeatureModal";
import { useRouter } from "next/navigation";

type Phase = "idle" | "splat" | "curtain" | "fall";

type Drip = {
  x: number;
  width: number;
  depth: number;
  wobble: number;
  speed: number;
  phase: number;
};

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function drawSplat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  lobes = 8,
  color = "#e71d36"
) {
  ctx.save();
  ctx.beginPath();

  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const mod = 0.82 + Math.sin(i * 2.13) * 0.14 + Math.cos(i * 1.33) * 0.06;
    const r = radius * mod;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x - radius * 0.18, y - radius * 0.18, radius * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();

  ctx.restore();
}

function drawJuiceCurtain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  progress: number
) {
  const topY = 0;
  const baseBottom = height * (0.18 + progress * 1.0);

  const drips: Drip[] = [
    {
      x: width * 0.16,
      width: width * 0.08,
      depth: 95 + Math.sin(t * 0.002) * 8,
      wobble: 10,
      speed: 0.0017,
      phase: 0.3,
    },
    {
      x: width * 0.48,
      width: width * 0.12,
      depth: 165 + Math.sin(t * 0.0015 + 1.8) * 14,
      wobble: 15,
      speed: 0.0012,
      phase: 1.1,
    },
    {
      x: width * 0.76,
      width: width * 0.09,
      depth: 110 + Math.sin(t * 0.0021 + 2.4) * 10,
      wobble: 12,
      speed: 0.0018,
      phase: 2.2,
    },
  ];

  const getDripInfluence = (x: number) => {
    let influence = 0;

    for (const d of drips) {
      const center = d.x + Math.sin(t * d.speed + d.phase) * d.wobble;
      const dx = x - center;
      const norm = Math.abs(dx) / d.width;

      if (norm < 1) {
        const falloff = 1 - norm * norm;
        influence += d.depth * falloff * falloff;
      }
    }

    return influence;
  };

  const getBottomY = (x: number) => {
    const wave1 = Math.sin(x * 0.008 + t * 0.0012) * 10;
    const wave2 = Math.sin(x * 0.019 + t * 0.0008 + 1.5) * 6;
    const wave3 = Math.sin(x * 0.031 + t * 0.001 + 0.7) * 3;

    return baseBottom + wave1 + wave2 + wave3 + getDripInfluence(x);
  };

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(width, topY);

  const step = 16;
  for (let x = width; x >= 0; x -= step) {
    ctx.lineTo(x, getBottomY(x));
  }

  ctx.closePath();

  const grad = ctx.createLinearGradient(0, topY, 0, baseBottom + 220);
  grad.addColorStop(0, "#ff6672");
  grad.addColorStop(0.3, "#ef233c");
  grad.addColorStop(1, "#b80f2e");

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(width, 20);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  for (let x = 0; x <= width; x += step) {
    const y = getBottomY(x) - 16;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(255, 215, 215, 0.16)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  for (let x = 0; x <= width; x += step) {
    const y = getBottomY(x) + 10;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(120, 0, 20, 0.22)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  drawSplat(ctx, width * 0.2, baseBottom + 28, 12, 8);
  drawSplat(ctx, width * 0.72, baseBottom + 42, 16, 8);

  ctx.restore();
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  elongation: number;
};

export default function LandingHero() {
  const router = useRouter();

  const [mode, setMode] = useState<"hero" | "map">("hero");
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<FeatureKey | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [transitioning, setTransitioning] = useState(false);
  const [shake, setShake] = useState(false);
  const [split, setSplit] = useState(false);

  const [showCanvas, setShowCanvas] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const [mapMounted, setMapMounted] = useState(false);
  const [gameReady, setGameReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallStartRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const particlesRef = useRef<Particle[]>([]);

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
    setShowCanvas(false);
    setPhase("idle");
    fallStartRef.current = null;
    particlesRef.current = [];
  };

  const spawnSplatParticles = () => {
    const count = 26;
    const list: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 520;
      const up = -220 - Math.random() * 260;

      list.push({
        x: window.innerWidth * 0.73 + spread * 0.35,
        y: window.innerHeight * 0.38,
        vx: spread * 0.015,
        vy: up * 0.015,
        r: 6 + Math.random() * 14,
        life: 0,
        maxLife: 500 + Math.random() * 400,
        elongation: 1 + Math.random() * 1.8,
      });
    }

    particlesRef.current = list;
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

    later(360, () => {
      setShowCanvas(true);
      setPhase("splat");
      spawnSplatParticles();
    });

    later(620, () => {
      setPhase("curtain");
      setMapMounted(true);
      setMode("map");
    });
  };

  const handleGameReady = () => {
    if (gameReady) return;

    setGameReady(true);

    later(340, () => {
      setPhase("fall");
    });

    later(2000, () => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showCanvas || phase === "idle") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let start = performance.now();

    const render = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      ctx.clearRect(0, 0, w, h);

      const t = now - start;

      if (phase === "splat") {
        const gravity = 0.22;

        particlesRef.current = particlesRef.current
          .map((p) => {
            const next = { ...p };
            next.life += 16;
            next.x += next.vx;
            next.y += next.vy;
            next.vy += gravity;
            return next;
          })
          .filter((p) => p.life < p.maxLife);

        for (const p of particlesRef.current) {
          const alpha = Math.max(0, 1 - p.life / p.maxLife);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1, p.elongation);

          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(231,29,54,${alpha})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(-p.r * 0.2, -p.r * 0.2, p.r * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.18})`;
          ctx.fill();

          ctx.restore();
        }

        drawSplat(ctx, w * 0.66, h * 0.24, 40, 9);
        drawSplat(ctx, w * 0.74, h * 0.2, 24, 8);
      }

      let curtainProgress = 0;

      if (phase === "curtain") {
        curtainProgress = 0.02;
      }

      if (phase === "fall") {
        if (fallStartRef.current === null) {
          fallStartRef.current = now;
        }

        const elapsed = now - fallStartRef.current;
        const duration = 1450;
        const raw = Math.min(elapsed / duration, 1);
        curtainProgress = easeOutCubic(raw);
      } else {
        fallStartRef.current = null;
      }

      if (phase === "curtain" || phase === "fall") {
        drawJuiceCurtain(ctx, w, h, t, curtainProgress);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => cancelAnimationFrame(raf);
  }, [showCanvas, phase]);

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

      {showCanvas && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 9999 }}
        />
      )}

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
                    } ${transitioning ? "cursor-default" : "cursor-pointer"}`}
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