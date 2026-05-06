"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureKey } from "@/game/types";
import GameExperience from "./GameExperience";
import { FeatureModal } from "./FeatureModal";
import { useRouter } from "next/navigation";

type Phase = "idle" | "split" | "splash" | "cover" | "hold" | "fall";

type JuiceDrop = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  r: number;
  targetR: number;
  alpha: number;
  delay: number;
  life: number;
  maxLife: number;
  angle: number;
  stretch: number;
  shape: number;
  color: string;
  stuck: boolean;
  cover: boolean;
};

const JUICE_COLORS = ["#b80f24", "#d3182d", "#ef3340", "#ff5964", "#ff7a80"];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function spawnDrops(
  width: number,
  height: number,
  originX: number,
  originY: number
): JuiceDrop[] {
  const drops: JuiceDrop[] = [];
  const diagonal = Math.hypot(width, height);

  // Chorros principales: salen radialmente desde la sandía
  // hacia afuera cubriendo toda la pantalla
  const jets = [
  { a: -2.55, dist: 0.42, size: 0.035, delay: 0 },
  { a: -1.55, dist: 0.34, size: 0.03, delay: 35 },
  { a: -0.35, dist: 0.44, size: 0.04, delay: 15 },
  { a: 0.55, dist: 0.36, size: 0.032, delay: 45 },
  { a: 1.65, dist: 0.38, size: 0.036, delay: 25 },
  { a: 2.55, dist: 0.32, size: 0.028, delay: 65 },
];


  for (const jet of jets) {
    const endX = originX + Math.cos(jet.a) * diagonal * jet.dist;
    const endY = originY + Math.sin(jet.a) * diagonal * jet.dist * 0.65;

    drops.push({
      x: originX,
      y: originY,
      startX: originX,
      startY: originY,
      endX,
      endY,
      r: 0,
      targetR: diagonal * jet.size,
      alpha: 0,
      delay: jet.delay,
      life: 0,
      maxLife: 1100,
      angle: jet.a,
      stretch: 0.18, 
      shape: Math.random() * 100,
      color: JUICE_COLORS[Math.floor(Math.random() * JUICE_COLORS.length)],
      stuck: true,
      cover: false,
    });
  }

  // Micro gotas satélite
  for (let i = 0; i < 38; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = diagonal * (0.10 + Math.random() * 0.38);
    drops.push({
      x: originX,
      y: originY,
      startX: originX,
      startY: originY,
      endX: originX + Math.cos(a) * dist,
      endY: originY + Math.sin(a) * dist * 0.60,
      r: 0,
      targetR: diagonal * (0.006 + Math.random() * 0.016),
      alpha: 0,
      delay: 10 + Math.random() * 200,
      life: 0,
      maxLife: 600 + Math.random() * 300,
      angle: a,
      stretch: 0.05 + Math.random() * 0.15, 
      shape: Math.random() * 100,
      color: JUICE_COLORS[Math.floor(Math.random() * JUICE_COLORS.length)],
      stuck: false,
      cover: false,
    });
  }

  // Gotas madre: son las que realmente cubren la cámara y crean la cortina.
  // Nacen desde el splash, pero terminan como manchas grandes en el lente.
  const coverDrops = [
  { x: 0.34, y: 0.34, r: 0.24, delay: 35, angle: -0.55, stretch: 0.2, color: "#ef3340" },
  { x: 0.62, y: 0.36, r: 0.28, delay: 60, angle: 0.2, stretch: 0.16, color: "#d3182d" },
  { x: 0.48, y: 0.64, r: 0.3, delay: 90, angle: 0.45, stretch: 0.18, color: "#ff5964" },
  { x: 0.78, y: 0.66, r: 0.24, delay: 120, angle: -0.18, stretch: 0.2, color: "#b80f24" },
];


  for (const d of coverDrops) {
    const endX = width * d.x;
    const endY = height * d.y;

    drops.push({
      x: originX,
      y: originY,
      startX: originX,
      startY: originY,
      endX,
      endY,
      r: 0,
      targetR: Math.max(width, height) * d.r,
      alpha: 0,
      delay: d.delay,
      life: 0,
      maxLife: 2600,
      angle: d.angle,
      stretch: d.stretch,
      shape: Math.random() * 100,
      color: d.color,
      stuck: true,
      cover: true,
    });
  }

  return drops;
}


function drawDrop(
  ctx: CanvasRenderingContext2D,
  drop: JuiceDrop,
  time: number
) {
  if (drop.alpha <= 0 || drop.r <= 0) return;

  const rr = parseInt(drop.color.slice(1, 3), 16);
  const gg = parseInt(drop.color.slice(3, 5), 16);
  const bb = parseInt(drop.color.slice(5, 7), 16);

  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.angle);

  // stretch muy bajo → gota casi esférica, apenas elongada en la dirección del vuelo
  // El scale horizontal apenas supera 1, el vertical es casi 1 también
  const sx = 1 + drop.stretch * 0.55; // máx ~1.1 con stretch=0.18
  const sy = 1 - drop.stretch * 0.18; // máx ~0.97 — casi circular
  ctx.scale(sx, sy);

  const steps = 32;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    const head = ca > 0 ? ca * ca * 0.16 : 0;
    const tail = ca < 0 ? -Math.pow(-ca, 1.7) * 0.18 : 0;
    const noise = 1 + Math.sin(a * 2 + drop.shape) * 0.035 + Math.sin(a * 5.5 + drop.shape * 0.7) * 0.018;
    const r = drop.r * (1 + head + tail) * noise;


    if (i === 0) ctx.moveTo(ca * r, sa * r);
    else ctx.lineTo(ca * r, sa * r);
  }
  ctx.closePath();

  // Gradiente radial con luz desde arriba-izquierda
  const grad = ctx.createRadialGradient(
    -drop.r * 0.22, -drop.r * 0.28, drop.r * 0.03,
     drop.r * 0.05,  drop.r * 0.05, drop.r * 1.4
  );
  grad.addColorStop(0,    `rgba(255, 195, 195, ${drop.alpha * 0.75})`);
  grad.addColorStop(0.30, `rgba(${Math.min(255,rr+25)}, ${Math.min(255,gg+12)}, ${Math.min(255,bb+8)}, ${drop.alpha * 0.90})`);
  grad.addColorStop(0.72, `rgba(${rr}, ${gg}, ${bb}, ${drop.alpha * 0.96})`);
  grad.addColorStop(1,    `rgba(${Math.max(0,rr-55)}, ${Math.max(0,gg-14)}, ${Math.max(0,bb-10)}, ${drop.alpha * 0.88})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Brillo especular pequeño — lo que hace que parezca húmedo
  ctx.beginPath();
  ctx.ellipse(-drop.r * 0.16, -drop.r * 0.24, drop.r * 0.14, drop.r * 0.06, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${drop.alpha * 0.38})`;
  ctx.fill();

  ctx.restore();
}

function drawFilament(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  thickness: number,
  alpha: number,
  time: number,
  seed: number
) {
  if (alpha <= 0 || thickness <= 0) return;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 18) return;

  const nx = -dy / len;
  const ny = dx / len;
  const wobble = Math.sin(time * 0.0012 + seed) * thickness * 2.1;

  const c1x = fromX + dx * 0.32 + nx * wobble;
  const c1y = fromY + dy * 0.32 + ny * wobble;
  const c2x = fromX + dx * 0.74 - nx * wobble * 0.55;
  const c2y = fromY + dy * 0.74 - ny * wobble * 0.55;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, toX, toY);
  ctx.strokeStyle = `rgba(210, 24, 34, ${alpha})`;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, toX, toY);
  ctx.strokeStyle = `rgba(255, 205, 205, ${alpha * 0.26})`;
  ctx.lineWidth = Math.max(1, thickness * 0.34);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawCurtain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  time: number,
  offsetY = 0,
  drops: JuiceDrop[] = [],
  sandiaY = 0
) {
  const p = clamp01(progress);
  if (p <= 0) return;

  const stuckDrops = drops.filter((d) => d.stuck);
  const coverDrops = drops.filter((d) => d.cover);
  const originX = stuckDrops[0]?.startX ?? width * 0.56;
  const originY = stuckDrops[0]?.startY ?? (sandiaY || height * 0.5);

  const drawOrganicFullFilm = (alpha = 1) => {
    const bottomAt = (x: number) => {
      const base = height + 28;
      return (
        base +
        Math.sin(x * 0.006 + time * 0.001) * 24 +
        Math.sin(x * 0.017 + time * 0.0008 + 1.3) * 13 +
        Math.sin(x * 0.031 + time * 0.00055) * 6
      );
    };

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);

    const step = 16;
    for (let x = width; x >= 0; x -= step) {
      ctx.lineTo(x, bottomAt(x));
    }

    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `rgba(255, 112, 120, ${alpha})`);
    grad.addColorStop(0.34, `rgba(239, 51, 64, ${alpha})`);
    grad.addColorStop(0.72, `rgba(201, 21, 39, ${alpha})`);
    grad.addColorStop(1, `rgba(133, 11, 24, ${alpha})`);

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let x = 0; x <= width; x += step) {
      const y = bottomAt(x) - 18;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255, 215, 215, ${0.18 * alpha})`;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  ctx.save();
  ctx.translate(0, offsetY);

  if (offsetY > 0) {
    drawOrganicFullFilm(1);
    ctx.restore();
    return;
  }

  const filmAlpha = smoothstep(0.08, 0.46, p);
  const solidAlpha = smoothstep(0.78, 0.98, p);

  for (const d of stuckDrops) {
    const local = smoothstep(0.02, 0.62, p);
    if (local <= 0) continue;
        const anchorX = lerp(originX, d.x, 0.42);
    const anchorY = lerp(originY, d.y, 0.42);

    const dx = d.x - anchorX;
    const dy = d.y - anchorY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    const thickness = lerp(d.r * 0.18, d.r * 0.58, local);
    const wobble = Math.sin(time * 0.001 + d.shape) * thickness * 0.34;

    const c1x = anchorX + dx * 0.28 + nx * wobble;
    const c1y = anchorY + dy * 0.28 + ny * wobble;
    const c2x = anchorX + dx * 0.74 - nx * wobble * 0.55;
    const c2y = anchorY + dy * 0.74 - ny * wobble * 0.55;

    ctx.beginPath();
    ctx.moveTo(anchorX + nx * thickness * 0.2, anchorY + ny * thickness * 0.2);
    ctx.bezierCurveTo(
      c1x + nx * thickness,
      c1y + ny * thickness,
      c2x + nx * thickness * 0.65,
      c2y + ny * thickness * 0.65,
      d.x + nx * thickness * 0.35,
      d.y + ny * thickness * 0.35
    );
    ctx.quadraticCurveTo(
      d.x + (dx / len) * thickness * 0.45,
      d.y + (dy / len) * thickness * 0.45,
      d.x - nx * thickness * 0.35,
      d.y - ny * thickness * 0.35
    );
    ctx.bezierCurveTo(
      c2x - nx * thickness * 0.65,
      c2y - ny * thickness * 0.65,
      c1x - nx * thickness,
      c1y - ny * thickness,
      anchorX - nx * thickness * 0.2,
      anchorY - ny * thickness * 0.2
    );

    ctx.closePath();

    const ribbonGrad = ctx.createLinearGradient(originX, originY, d.x, d.y);
    ribbonGrad.addColorStop(0, `rgba(255, 95, 105, ${0.28 * filmAlpha})`);
    ribbonGrad.addColorStop(0.45, `rgba(225, 34, 48, ${0.46 * filmAlpha})`);
    ribbonGrad.addColorStop(1, `rgba(157, 12, 28, ${0.52 * filmAlpha})`);

    ctx.fillStyle = ribbonGrad;
    ctx.fill();
  }

  // Gotas madre: estas son las que cubren visualmente la pantalla.
  for (const d of coverDrops) {
    const local = clamp01(p * 1.4);
    const filmDrop: JuiceDrop = {
      ...d,
      r: d.r * (1 + local * 0.45),
      alpha: d.alpha * (1 - p * 0.08),
      stretch: d.stretch + local * 0.12,
    };

    drawDrop(ctx, filmDrop, time);
  }

  // Núcleo central para que todo se sienta como una misma masa.
  const core = smoothstep(0.16, 0.72, p);
  if (core > 0) {
    const coreDrop: JuiceDrop = {
      x: originX,
      y: originY,
      startX: originX,
      startY: originY,
      endX: originX,
      endY: originY,
      r: Math.max(width, height) * lerp(0.08, 0.55, core),
      targetR: 0,
      alpha: 0.78 * core,
      delay: 0,
      life: 0,
      maxLife: 1,
      angle: -0.15,
      stretch: 0.18,
      shape: 77,
      color: "#d3182d",
      stuck: true,
      cover: true,
    };

    drawDrop(ctx, coreDrop, time);
  }

  // Relleno final orgánico, no rectángulo puro.
  if (solidAlpha > 0) {
    drawOrganicFullFilm(solidAlpha);
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
  const [mapMounted, setMapMounted] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false); // true solo cuando la cortina cubrió todo

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const sandiaRef = useRef<HTMLButtonElement | null>(null); // para leer posición real
  const loopRef = useRef<((ts: number) => void) | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const phaseStartRef = useRef(0);
  const splashStartRef = useRef(0);
  const dropsRef = useRef<JuiceDrop[]>([]);
  const originRef = useRef({ x: 0, y: 0 }); // posición real de la sandía
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const gameReadyRef = useRef(false);

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const setPhase = (phase: Phase) => {
  const now = performance.now();

  phaseRef.current = phase;
  phaseStartRef.current = now;

  if (phase === "splash") {
    splashStartRef.current = now;
  }
};


  const resetTransition = () => {
    setTransitioning(false);
    setShake(false);
    setSplit(false);
    setShowCanvas(false);
    dropsRef.current = [];
    phaseRef.current = "idle";
    gameReadyRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const loop = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const phase = phaseRef.current;
    const age = now - phaseStartRef.current;

    ctx.clearRect(0, 0, width, height);

    if (phase === "splash" || phase === "cover") {
  const curtainFade = phase === "cover" ? easeInOutCubic(clamp01(age / 1000)) : 0;

  for (const d of dropsRef.current) {
    const localAge = now - splashStartRef.current - d.delay;
    if (localAge < 0) continue;

    d.life += 16;

    const moveT = easeOutCubic(clamp01(localAge / 520));
    const settleT = easeInOutCubic(clamp01((localAge - 420) / 500));

    d.x = lerp(d.startX, d.endX, moveT);
    d.y = lerp(d.startY, d.endY, moveT);

    if (d.cover) {
      const coverGrow = easeInOutCubic(clamp01((localAge - 40) / 760));
      d.r = lerp(d.r, d.targetR * coverGrow, 0.11);
      d.alpha = Math.min(0.86, coverGrow * 0.86);
    } else if (d.stuck) {
      d.r = lerp(d.r, d.targetR * (1 + settleT * 0.55), 0.22);
      d.alpha = Math.min(0.84, moveT * 0.86);
    } else {
      const lifeFade = 1 - clamp01(d.life / d.maxLife);
      d.r = lerp(d.r, d.targetR, 0.26);
      d.alpha = Math.min(0.78, moveT * 0.78) * lifeFade * (1 - curtainFade);
    }

    const shouldDrawAsLooseDrop = phase === "splash" || (!d.stuck && !d.cover);

    if (shouldDrawAsLooseDrop) {
      if (phase === "splash" && localAge < 620 && d.r > 3) {
        const tailX = lerp(d.startX, d.x, 0.7);
        const tailY = lerp(d.startY, d.y, 0.7);

        drawFilament(
          ctx,
          tailX,
          tailY,
          d.x,
          d.y,
          Math.max(1, d.r * 0.055),
          d.alpha * 0.34,
          now,
          d.shape
        );
      }

      drawDrop(ctx, d, now);
    }
  }
}

    if (phase === "cover") {
      const cover = easeInOutCubic(clamp01(age / 1250));
      drawCurtain(ctx, width, height, cover, now, 0, dropsRef.current, originRef.current.y);

      if (cover >= 0.98) {
        setPhase("hold");
        setHeroHidden(true); 
      }
    }

    if (phase === "hold") {
      drawCurtain(ctx, width, height, 1, now, 0, dropsRef.current, originRef.current.y);

      if (gameReadyRef.current) {
        setPhase("fall");
      }
    }

    if (phase === "fall") {
      const DURATION = 2000;
      const t = clamp01(age / DURATION);

      // Gravedad real en 3 tramos:
      // 0–20%: tensión superficial, casi no se mueve
      // 20–55%: empieza a resbalar
      // 55–100%: caída libre acelerada
      let eased: number;
      if (t < 0.20) {
        eased = t * t * 0.15;
      } else if (t < 0.55) {
        eased = 0.006 + Math.pow((t - 0.20) / 0.35, 2) * 0.22;
      } else {
        eased = 0.226 + Math.pow((t - 0.55) / 0.45, 1.7) * 0.774;
      }

      const offsetY = eased * (height + 300);

      if (sceneRef.current) {
        // El escenario aparece gradualmente a medida que la cortina baja.
        // Empieza a verse cuando la cortina ya lleva ~25% del recorrido.
        sceneRef.current.style.opacity = String(clamp01((t - 0.25) / 0.55));
      }

      drawCurtain(ctx, width, height, 1, now, offsetY, dropsRef.current, originRef.current.y);

      if (t >= 1) {
        if (sceneRef.current) sceneRef.current.style.opacity = "1";
        resetTransition();
        return;
      }
    }

    rafRef.current = requestAnimationFrame((ts) => loopRef.current?.(ts));
  };

  loopRef.current = loop;

  const startTransition = () => {
    if (transitioning) return;

    setTransitioning(true);
    setShake(true);
    gameReadyRef.current = false;

    // Leer posición real de la sandía desde el DOM
    // Así el jugo siempre sale exactamente del centro de donde está la sandía,
    // independientemente del tamaño de pantalla o el layout.
    const rect = sandiaRef.current?.getBoundingClientRect();
    originRef.current = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth * 0.72, y: window.innerHeight * 0.45 }; 

    setMapMounted(true);

    later(180, () => { setShake(false); setSplit(true); });

    later(320, () => {
      const { x, y } = originRef.current;
      dropsRef.current = spawnDrops(window.innerWidth, window.innerHeight, x, y);
      setShowCanvas(true);
      setPhase("splash");
      rafRef.current = requestAnimationFrame((ts) => loopRef.current?.(ts));
    });

    later(820, () => { setPhase("cover"); });
  };

  const handleGameReady = () => {
    gameReadyRef.current = true;
  };

  const returnToHero = () => {
    setOpen(false);
    setFeature(null);
    setMode("hero");
    setMapMounted(false);
    setHeroHidden(false);
    resetTransition();

    if (sceneRef.current) {
      sceneRef.current.style.opacity = "0";
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 relative overflow-hidden">
      {mapMounted && (
        <div
          ref={sceneRef}
          className="fixed inset-0 z-10 bg-neutral-50"
          style={{ opacity: 0 }}
        >
          <GameExperience
            onFeature={(k) => {
              if ((k as string) === "exit") {
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

      {/* Hero — visible durante toda la animación de jugo.
          Solo desaparece cuando la cortina cubrió la pantalla completamente. */}
      <div className={`relative z-20 transition-opacity duration-200 ${
        heroHidden || mode === "map" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
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
                  className="px-5 py-3 rounded-2xl bg-black text-white disabled:opacity-50"
                  onClick={startTransition}
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
                    ref={sandiaRef}
                    className={`relative w-72 h-72 rounded-full bg-green-600 shadow-lg overflow-hidden ${
                      shake ? "animate-[wiggle_0.22s_ease-in-out]" : ""
                    } ${transitioning ? "cursor-default" : "cursor-pointer hover:scale-105 transition-transform duration-150"}`}
                    onClick={startTransition}
                    aria-label="Entrar a la demo"
                    disabled={transitioning}
                  >
                    <div className="absolute inset-6 rounded-full bg-red-500 opacity-90" />
                    <div className="absolute inset-0 rounded-full border-[6px] border-green-700 opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-semibold z-10 text-lg">
                      Click 🍉
                    </div>
                  </button>
                ) : (
                  <div className="relative w-72 h-72">
                    <div className="absolute left-1/2 top-1/2 w-32 h-56 -translate-y-1/2 -translate-x-[120%] rounded-l-full bg-red-500 border-[14px] border-green-600 border-r-0 rotate-[-14deg] shadow-xl" />
                    <div className="absolute left-1/2 top-1/2 w-32 h-56 -translate-y-1/2 translate-x-[20%] rounded-r-full bg-red-500 border-[14px] border-green-600 border-l-0 rotate-[14deg] shadow-xl" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-red-400 opacity-80 animate-ping" />
                    </div>
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
        onClose={() => {
          setOpen(false);
          window.setTimeout(() => setFeature(null), 50);
        }}
      />
    </main>
  );
}