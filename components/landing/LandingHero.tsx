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

const GAME_ASSETS = [
  "/assets/office_bg.png",
  "/assets/sprite_fixed.png",
  "/assets/prop_demo_desk.png",
  "/assets/prop_organizacion_shelf.png",
  "/assets/prop_crecimiento_board.png",
  "/assets/prop_seguimiento_tv.png",
  "/assets/prop_exit_door.png",
];

/* ───────────────────────────────────────────────────────────
   Contenido de la landing (placeholder editable).
   Presenta a la agencia: marketing en redes, construcción de
   marca y diseño gráfico. Nada de esto toca la demo interactiva
   ni la animación de jugo — el cliente puede personalizar
   textos, íconos y colores libremente desde aquí.
   Íconos: paths de línea (outline) — sin emojis.
   ─────────────────────────────────────────────────────────── */
const AGENCY_SERVICES = [
  {
    iconPath:
      "M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
    title: "Marketing en redes",
    desc: "Estrategia, calendario y gestión de contenido para que tu marca esté presente donde está tu audiencia.",
    accent: "from-rose-500 to-red-600",
  },
  {
    iconPath:
      "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
    title: "Construcción de marca",
    desc: "Definimos identidad, tono y propósito para que tu marca se sienta única y memorable.",
    accent: "from-emerald-500 to-green-600",
  },
  {
    iconPath:
      "M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42",
    title: "Diseño gráfico",
    desc: "Piezas visuales frescas y coherentes: logos, feeds, campañas y todo lo que tu marca necesita.",
    accent: "from-pink-500 to-rose-600",
  },
  {
    iconPath:
      "M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316ZM16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z",
    title: "Contenido & fotografía",
    desc: "Producción de fotos, video y reels que capturan la esencia de tu marca y detienen el scroll.",
    accent: "from-lime-500 to-emerald-600",
  },
  {
    iconPath:
      "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
    title: "Campañas & pauta",
    desc: "Publicidad pensada para crecer: segmentación, creatividades y optimización de resultados.",
    accent: "from-amber-500 to-orange-600",
  },
  {
    iconPath:
      "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
    title: "Estrategia digital",
    desc: "Un plan claro y medible que conecta cada acción con los objetivos reales de tu negocio.",
    accent: "from-teal-500 to-cyan-600",
  },
];

const AGENCY_STEPS = [
  {
    n: "01",
    title: "Descubrimiento",
    desc: "Entendemos tu marca, tu mercado y hacia dónde quieres llegar.",
  },
  {
    n: "02",
    title: "Estrategia",
    desc: "Diseñamos un plan a la medida, con objetivos y métricas claras.",
  },
  {
    n: "03",
    title: "Creación",
    desc: "Producimos diseño y contenido que refleja la personalidad de tu marca.",
  },
  {
    n: "04",
    title: "Resultados",
    desc: "Publicamos, medimos y optimizamos para seguir creciendo.",
  },
];

const AGENCY_STATS = [
  { value: "+50", label: "Marcas potenciadas" },
  { value: "+1M", label: "Alcance generado" },
  { value: "98%", label: "Clientes satisfechos" },
  { value: "24/7", label: "Acompañamiento" },
];

const AGENCY_WORK = [
  { label: "Branding", tag: "Identidad", accent: "from-emerald-400 to-green-600" },
  { label: "Redes sociales", tag: "Contenido", accent: "from-rose-400 to-red-600" },
  { label: "Diseño de campaña", tag: "Publicidad", accent: "from-pink-400 to-rose-600" },
  { label: "Feed & reels", tag: "Producción", accent: "from-lime-400 to-emerald-600" },
];

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();

    img.onload = async () => {
      try {
        await img.decode?.();
      } catch {
        // Si decode falla, Phaser todavía puede intentar usar la imagen.
      }

      resolve();
    };

    img.onerror = () => resolve();
    img.src = src;
  });
}


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

  const sx = 1 + drop.stretch * 0.55; 
  const sy = 1 - drop.stretch * 0.18; 
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

  // Brillo especular pequeño 
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

  // Relleno final orgánico
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
  const [assetsReady, setAssetsReady] = useState(false);

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
  const assetsReadyRef = useRef(false);


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

  useEffect(() => {
  let cancelled = false;

  Promise.all(GAME_ASSETS.map(preloadImage)).then(() => {
    if (!cancelled) {
      assetsReadyRef.current = true;
      setAssetsReady(true);
    }
  });

  return () => {
    cancelled = true;
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
  if (transitioning || !assetsReadyRef.current) return;


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

    later(180, () => { setShake(false); setSplit(true); });

    later(320, () => {
      const { x, y } = originRef.current;
      dropsRef.current = spawnDrops(window.innerWidth, window.innerHeight, x, y);
      setShowCanvas(true);
      setPhase("splash");
      rafRef.current = requestAnimationFrame((ts) => loopRef.current?.(ts));
    });

    later(650, () => {
    setMapMounted(true);
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
    <main className="min-h-screen bg-neutral-50 relative overflow-x-hidden">
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
                  disabled={transitioning || !assetsReady}
                >
                  {assetsReady ? "Explorar demo" : "Cargando demo..."}
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
                    disabled={transitioning || !assetsReady}
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

        {/* ─── Servicios ─────────────────────────────────────── */}
        <section id="servicios" className="bg-[#eaf6ec] px-5 py-20">
          <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-red-600">
              Lo que hacemos
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight text-black">
              Marketing, marca y diseño que{" "}
              <span className="bg-linear-to-r from-green-600 to-red-500 bg-clip-text text-transparent">
                se sienten frescos
              </span>
              .
            </h2>
            <p className="mt-4 text-neutral-600">
              Ayudamos a marcas a destacar en redes con estrategia, contenido y
              diseño hechos a la medida.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AGENCY_SERVICES.map((s) => (
              <div
                key={s.title}
                className="group relative rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${s.accent} text-white shadow-md`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.6}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={s.iconPath}
                    />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-black">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ─── Proceso ───────────────────────────────────────── */}
        <section id="proceso" className="bg-[#fcecec]">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-600">
                Cómo trabajamos
              </span>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight text-black">
                Un proceso simple, resultados que se notan.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {AGENCY_STEPS.map((step) => (
                <div
                  key={step.n}
                  className="relative rounded-3xl border border-black/5 bg-white p-6"
                >
                  <span className="text-4xl font-bold bg-linear-to-br from-green-600 to-red-500 bg-clip-text text-transparent">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-black">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Métricas ──────────────────────────────────────── */}
        <section className="bg-[#eaf6ec] px-5 py-16">
          <div className="mx-auto max-w-6xl">
          <div className="rounded-4xl bg-linear-to-r from-green-600 via-emerald-500 to-red-500 p-px shadow-lg">
            <div className="rounded-[calc(2rem-1px)] bg-white/95 px-6 py-10 backdrop-blur">
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {AGENCY_STATS.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-4xl md:text-5xl font-bold bg-linear-to-br from-green-600 to-red-500 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-neutral-600">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* ─── Trabajo / portafolio (placeholder) ────────────── */}
        <section id="trabajo" className="bg-[#fcecec] px-5 py-16">
          <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-red-600">
                Nuestro trabajo
              </span>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight text-black">
                Marcas que ya dieron el salto.
              </h2>
            </div>
            <span className="text-sm text-neutral-500">
              Galería de ejemplo — personalizable, trabajo en progreso
            </span>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AGENCY_WORK.map((w) => (
              <div
                key={w.label}
                className={`group relative flex aspect-4/5 flex-col justify-end overflow-hidden rounded-3xl bg-linear-to-br ${w.accent} p-5 text-white shadow-md transition-transform duration-300 hover:-translate-y-1`}
              >
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                <span className="relative text-xs font-medium uppercase tracking-wider text-white/80">
                  {w.tag}
                </span>
                <span className="relative mt-1 text-lg font-semibold">
                  {w.label}
                </span>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ─── Testimonio ────────────────────────────────────── */}
        <section className="bg-[#eaf6ec]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mx-auto h-10 w-10 text-red-500/30"
            >
              <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.57-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
            </svg>
            <p className="mt-6 text-2xl md:text-3xl font-medium leading-snug text-black">
              “Le dieron a nuestra marca una personalidad que la gente reconoce
              al instante. El antes y el después es día y noche.”
            </p>
            <div className="mt-6 text-sm text-neutral-500">
              Cliente satisfecho — Testimonio de ejemplo
            </div>
          </div>
        </section>

        {/* ─── CTA final ─────────────────────────────────────── */}
        <section className="bg-[#fcecec] px-5 py-16">
          <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-green-700 via-emerald-600 to-red-600 px-8 py-16 text-center shadow-xl">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-black/10 blur-2xl" />
            <h2 className="relative text-3xl md:text-4xl font-semibold text-white">
              ¿Lista tu marca para reventar?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/85">
              Cuéntanos qué tienes en mente y armamos juntos la estrategia
              perfecta para tu negocio.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <button className="rounded-2xl bg-white px-6 py-3 font-semibold text-green-700 shadow-md transition-transform hover:scale-105">
                Contactar
              </button>
              <button className="rounded-2xl border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">
                Ver servicios
              </button>
            </div>
          </div>
          </div>
        </section>

        {/* ─── Footer ────────────────────────────────────────── */}
        <footer className="border-t border-black/5 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xs">
                <div className="flex items-center gap-2 font-bold text-black">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-green-600 to-red-500 text-xs text-white">
                    S
                  </span>
                  Sandía con Chile
                </div>
                <p className="mt-3 text-sm text-neutral-500">
                  Agencia de marketing en redes, construcción de marca y diseño
                  gráfico. Dulce, con su toque de picante.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Servicios
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                    <li>Marketing en redes</li>
                    <li>Construcción de marca</li>
                    <li>Diseño gráfico</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Agencia
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                    <li>Nosotros</li>
                    <li>Trabajo</li>
                    <li>Contacto</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Redes
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                    <li>Instagram</li>
                    <li>TikTok</li>
                    <li>LinkedIn</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t border-black/5 pt-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} Sandía con Chile. Todos los derechos reservados.</span>
              <span>Sitio de ejemplo — personalizable, trabajo en progreso.</span>
            </div>
          </div>
        </footer>
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