"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureKey } from "@/game/types";
import GameExperience from "./GameExperience";
import { FeatureModal } from "./FeatureModal";
import { useRouter } from "next/navigation";

type Phase = "idle" | "split" | "splash" | "cover" | "hold" | "fall";

type JuiceParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  targetR: number;
  life: number;
  maxLife: number;
  birth: number;
  alpha: number;
  targetAlpha: number;
  stretch: number;
  smear: number;
  rotation: number;
  spin: number;
  shape: number;
  stuck: boolean;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}


function drawJuiceBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stretch: number,
  alpha: number,
  rotation = 0,
  smear = 1,
  shape = 0
) {
  if (alpha <= 0 || r <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(smear, stretch);

  const steps = 22;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble =
      1 +
      Math.sin(a * 2.0 + shape) * 0.13 +
      Math.sin(a * 3.4 + shape * 1.7) * 0.1 +
      Math.sin(a * 5.8 - shape * 0.9) * 0.06;

    points.push({
      x: Math.cos(a) * r * wobble,
      y: Math.sin(a) * r * wobble,
    });
  }

  const grad = ctx.createRadialGradient(
    -r * 0.36,
    -r * 0.42,
    r * 0.08,
    0,
    0,
    r * 1.28
  );

  grad.addColorStop(0, `rgba(255, 190, 190, ${alpha})`);
  grad.addColorStop(0.28, `rgba(248, 113, 113, ${alpha * 0.96})`);
  grad.addColorStop(0.68, `rgba(220, 38, 38, ${alpha * 0.94})`);
  grad.addColorStop(1, `rgba(136, 19, 55, ${alpha * 0.9})`);

  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    if (i === 0) ctx.moveTo(midX, midY);
    else ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.23, r * 0.1, -0.45, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.22})`;
  ctx.fill();

  ctx.restore();
}

function drawJuiceSheet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  coverage: number,
  yOffset = 0
) {
  if (coverage <= 0) return;

  const cover = clamp01(coverage);
  const solid = smoothstep(0.72, 0.96, cover);

  ctx.save();
  ctx.translate(0, yOffset);

  // Manchas gigantes que se unen. Esto reemplaza la cortina que caía desde arriba.
  const stains = [
    { x: 0.12, y: 0.18, r: 0.34, sx: 1.9, sy: 0.8, rot: -0.12, delay: 0 },
    { x: 0.42, y: 0.2, r: 0.38, sx: 1.7, sy: 0.9, rot: 0.08, delay: 0.08 },
    { x: 0.76, y: 0.18, r: 0.36, sx: 1.8, sy: 0.85, rot: 0.16, delay: 0.16 },
    { x: 0.22, y: 0.55, r: 0.42, sx: 1.8, sy: 1.0, rot: 0.1, delay: 0.18 },
    { x: 0.56, y: 0.54, r: 0.46, sx: 1.9, sy: 1.05, rot: -0.08, delay: 0.24 },
    { x: 0.86, y: 0.58, r: 0.4, sx: 1.7, sy: 1.0, rot: 0.18, delay: 0.3 },
    { x: 0.36, y: 0.86, r: 0.42, sx: 1.9, sy: 0.9, rot: -0.16, delay: 0.34 },
    { x: 0.7, y: 0.88, r: 0.44, sx: 1.85, sy: 0.95, rot: 0.12, delay: 0.38 },
  ];

  for (const s of stains) {
    const local = smoothstep(s.delay, s.delay + 0.46, cover);
    if (local <= 0) continue;

    const r = Math.max(width, height) * s.r * local;
    drawJuiceBlob(
      ctx,
      width * s.x + Math.sin(t * 0.0007 + s.delay * 20) * 12,
      height * s.y + Math.cos(t * 0.0008 + s.delay * 18) * 10,
      r,
      s.sy,
      0.9 * local,
      s.rot,
      s.sx,
      s.delay * 100
    );
  }

  // Solo cuando las manchas ya casi cubrieron todo, se rellena lo que falta.
  if (solid > 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `rgba(255, 120, 120, ${solid})`);
    grad.addColorStop(0.36, `rgba(239, 68, 68, ${solid})`);
    grad.addColorStop(0.74, `rgba(220, 38, 38, ${solid})`);
    grad.addColorStop(1, `rgba(136, 19, 55, ${solid})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Borde inferior solamente para la caída/reveal, no para cubrir.
  if (yOffset > 0) {
    const bottom = height + 20;
    ctx.beginPath();
    ctx.moveTo(0, bottom);

    const step = 18;
    for (let x = 0; x <= width; x += step) {
      const y =
        bottom +
        Math.sin(x * 0.008 + t * 0.001) * 18 +
        Math.sin(x * 0.019 + t * 0.0007) * 10;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = "rgba(90,0,18,0.28)";
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  ctx.restore();
}



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
  const particlesRef = useRef<JuiceParticle[]>([]);
  const phaseStartRef = useRef<number | null>(null);
  const splashStartRef = useRef<number | null>(null);

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
    phaseStartRef.current = null;
    splashStartRef.current = null;
    particlesRef.current = [];
  };

  const startPhase = (next: Phase) => {
    const now = performance.now();
    setPhase(next);
    phaseStartRef.current = now;
    if (next === "splash") splashStartRef.current = now;
    if (next !== "fall") fallStartRef.current = null;
  };

  const spawnSplashParticles = () => {
    const particles: JuiceParticle[] = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const originX = w * 0.68;
    const originY = h * 0.43;

    for (let i = 0; i < 78; i++) {
      const angle = -Math.PI + Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 8.4;
      const heavy = Math.random() > 0.62;
      const r = heavy ? 8 + Math.random() * 18 : 2.5 + Math.random() * 6.5;

      particles.push({
        x: originX + (Math.random() - 0.5) * 34,
        y: originY + (Math.random() - 0.5) * 28,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 1.5,
        r,
        targetR: heavy ? r * (3.2 + Math.random() * 2.2) : r * (1.2 + Math.random()),
        life: 0,
        maxLife: heavy ? 3200 + Math.random() * 1000 : 1050 + Math.random() * 500,
        birth: 0,
        alpha: heavy ? 0.2 : 0.74,
        targetAlpha: heavy ? 0.86 : 0.78,
        stretch: heavy ? 0.52 + Math.random() * 0.78 : 0.9 + Math.random() * 1.3,
        smear: heavy ? 1.4 + Math.random() * 2.4 : 0.9 + Math.random() * 1.1,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.035,
        shape: Math.random() * 100,
        stuck: heavy,
      });
    }

    const anchors = [
      [0.2, 0.18, 78],
      [0.48, 0.28, 96],
      [0.74, 0.2, 80],
      [0.16, 0.58, 92],
      [0.52, 0.6, 118],
      [0.84, 0.56, 94],
      [0.34, 0.82, 86],
      [0.72, 0.84, 100],
    ];

    anchors.forEach(([px, py, size], index) => {
      const r = size * (0.52 + Math.random() * 0.22);

      particles.push({
        x: w * px + (Math.random() - 0.5) * 35,
        y: h * py + (Math.random() - 0.5) * 28,
        vx: (Math.random() - 0.5) * 0.22,
        vy: 0.05 + Math.random() * 0.18,
        r,
        targetR: r * (2.0 + Math.random() * 0.8),
        life: 0,
        maxLife: 5200,
        birth: 260 + index * 115,
        alpha: 0,
        targetAlpha: 0.88,
        stretch: 0.48 + Math.random() * 0.5,
        smear: 1.7 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.004,
        shape: Math.random() * 100,
        stuck: true,
      });
    });

    particlesRef.current = particles;
  };

  const startWatermelonTransition = () => {
    if (transitioning) return;

    setTransitioning(true);
    setGameReady(false);
    setShake(true);

    later(180, () => {
      setShake(false);
      setSplit(true);
      startPhase("split");
    });

    later(320, () => {
      setShowCanvas(true);
      spawnSplashParticles();
      startPhase("splash");
    });

    later(1500, () => {
  startPhase("cover");
});

later(3100, () => {
  startPhase("hold");
});

later(3700, () => {
  setMapMounted(true);
  setMode("map");
});


  };

  const handleGameReady = () => {
    if (gameReady) return;
    setGameReady(true);

    later(850, () => {
      startPhase("fall");
    });

    later(4200, () => {
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
    const start = performance.now();

    const render = (now: number) => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  const t = now - start;
  const phaseAge = phaseStartRef.current ? now - phaseStartRef.current : 0;
  const splashAge = splashStartRef.current ? now - splashStartRef.current : 0;

  let sheetCoverage = 0;
  let revealOffset = 0;

  if (phase === "cover") {
    sheetCoverage = easeInOutCubic(clamp01(phaseAge / 1650));
  }

  if (phase === "hold") {
    sheetCoverage = 1;
  }

  if (phase === "fall") {
    if (fallStartRef.current === null) fallStartRef.current = now;

    const elapsed = now - fallStartRef.current;
    const raw = clamp01(elapsed / 2850);

    sheetCoverage = 1;
    revealOffset = easeOutCubic(raw) * h * 1.28;
  }

  const isSceneVisible = mode === "map";
  const particleFadeByCover = phase === "cover" ? smoothstep(0.28, 0.78, sheetCoverage) : 0;
  const hideParticles = phase === "hold" || phase === "fall" || isSceneVisible;

  if (phase === "splash" || phase === "cover" || phase === "hold" || phase === "fall") {
    const gravity = phase === "splash" ? 0.055 : 0.03;
    const ageStep = 16;

    particlesRef.current = particlesRef.current
      .map((p) => {
        const next = { ...p };
        next.life += ageStep;

        const activeAge = Math.max(0, splashAge - next.birth);
        if (activeAge <= 0) return next;

        const lifeT = clamp01(activeAge / next.maxLife);
        const appear = easeOutCubic(clamp01(activeAge / 700));
        const stick = next.stuck ? easeOutCubic(clamp01(activeAge / 950)) : 0;

        next.x += next.vx * (1 - stick * 0.9);
        next.y += next.vy * (1 - stick * 0.82);
        next.vy += gravity;
        next.vx *= 0.978;
        next.vy *= 0.988;
        next.rotation += next.spin * (1 - stick * 0.7);

        if (next.stuck) {
          const grow = easeInOutCubic(clamp01(activeAge / 1850));
          next.r = lerp(next.r, next.targetR, 0.018 + grow * 0.018);

          const baseAlpha = lerp(0, next.targetAlpha, appear);
          next.alpha = hideParticles ? 0 : baseAlpha * (1 - particleFadeByCover);
        } else {
          const baseAlpha = (1 - lifeT) * next.targetAlpha;
          next.alpha = hideParticles ? 0 : baseAlpha * (1 - particleFadeByCover);
        }

        return next;
      })
      .filter((p) => p.stuck || p.life < p.maxLife);
  }

  ctx.globalCompositeOperation = "source-over";

  if (!hideParticles) {
    const visible = particlesRef.current.filter((p) => splashAge >= p.birth && p.alpha > 0.01);
    const stains = visible.filter((p) => p.stuck);
    const drops = visible.filter((p) => !p.stuck);

    for (const p of stains) {
      drawJuiceBlob(ctx, p.x, p.y, p.r, p.stretch, p.alpha, p.rotation, p.smear, p.shape);
    }

    for (const p of drops) {
      drawJuiceBlob(ctx, p.x, p.y, p.r, p.stretch, p.alpha, p.rotation, p.smear, p.shape);
    }
  }

  if (phase === "cover" || phase === "hold" || phase === "fall") {
    drawJuiceSheet(ctx, w, h, t, sheetCoverage, revealOffset);
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
          <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={() => router.push("/auth")}>
            Login
          </button>
          <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={() => router.push("/signup")}>
            Get started
          </button>
        </div>
      </header>

      <div className={`relative z-20 transition-opacity duration-300 ${mode === "map" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
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
                <button className="px-5 py-3 rounded-2xl bg-black text-white" onClick={startWatermelonTransition} disabled={transitioning}>
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

      <FeatureModal open={open} feature={feature} onClose={() => setOpen(false)} />
    </main>
  );
}
