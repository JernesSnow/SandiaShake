import * as Phaser from "phaser";
import type { FeatureKey, GameToUIEvent } from "../types";

type EmitFn = (evt: GameToUIEvent) => void;

type Station = {
  key: FeatureKey;
  x: number;
  y: number;
  label: string;
  labelY?: number;

  // Caja donde NO debe entrar el personaje 
  blockW: number;
  blockH: number;

  // Aura para mostrar hint y permitir Enter
  interactW: number;
  interactH: number;

  spriteKey: string;
  scale: number;
  yOffset?: number;      // para subir/bajar sin tocar colisión
  depthOffset?: number;  // para TV en pared etc
};

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyEnter!: Phaser.Input.Keyboard.Key;

  private emitToUI: EmitFn;
  private speed = 180;

  private hoveredFeature: FeatureKey | null = null;
  private locked = false;

  private lastMove = new Phaser.Math.Vector2(0, 1);
  private nextAllowedAt = 0;

  private WORLD_W=0;
  private WORLD_H=0;
  private floorTop=0;
  private floorBottom=0;
// Para escalar todo basado en la altura actual vs la base (1080p)
  private uiScale = 1;

  private readonly PLAYER_BASE = 1;       // tamaño general
private readonly PLAYER_DEPTH_EXTRA = 0.06; // cuánto crece al acercarse
private readonly BASE_H = 1080;

  constructor(emitToUI: EmitFn) {
    super("OfficeScene");
    this.emitToUI = emitToUI;
  }

  private insideAABB(px: number, py: number, x: number, y: number, w: number, h: number) {
    return Math.abs(px - x) <= w / 2 && Math.abs(py - y) <= h / 2;
  }

  preload() {
  //this.load.image("player", window.location.origin + "/assets/PersonajePrincipal.png");
  this.load.image("bg", "/assets/office_bg.png");
  // Spritesheet (6 frames en 3 columnas x 2 filas)
  this.load.spritesheet("player", "/assets/player_walk_animation.png", {
    frameWidth: 1536 / 4.9,  
    frameHeight: 1024 /2, 
  });
  this.load.image("demo", "/assets/prop_demo_desk.png");
  this.load.image("org", "/assets/prop_organizacion_shelf.png");
  this.load.image("growth", "/assets/prop_crecimiento_board.png");
  this.load.image("follow", "/assets/prop_seguimiento_tv.png");
  this.load.image("door", "/assets/prop_exit_door.png");
}

  create() {
  const w = this.scale.width;
  const h = this.scale.height;

  this.uiScale = h / this.BASE_H;
  
  // Mundo más ancho
  this.WORLD_W = w * 1.8;
  this.WORLD_H = h;

  // Solo “piso” caminable
  this.floorTop = h * 0.70;
  this.floorBottom = h * 1;

// Fondo temporal: llena el mundo completo 
const bg = this.add.image(0, 0, "bg")
  .setOrigin(0, 0)
  .setDisplaySize(this.WORLD_W, this.WORLD_H)
  .setDepth(0);

  // Cámara: límites del mundo y follow
  this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
  this.cameras.main.setZoom(1);
  this.cameras.main.setBackgroundColor("#f4f4f4");


  this.anims.create({
  key: "idle",
  frames: [{ key: "player", frame: 0 }],
  frameRate: 1,
  repeat: -1,
});


this.anims.create({
  key: "walk",
  frames: [
    { key: "player", frame: 0 },
    { key: "player", frame: 0 },

    { key: "player", frame: 1 },
    { key: "player", frame: 1 },

    { key: "player", frame: 0 },
    { key: "player", frame: 0 },

    { key: "player", frame: 2 },
    { key: "player", frame: 2 },

  ],
  frameRate: 8,
  repeat: -1
});

  // Tele de Seguimiento ARRIBA (decorativa)
  const followDecor = this.add.image(this.WORLD_W * 0.50, h * 0.22, "follow")
    .setOrigin(0.5, 0.5)
    .setScale(0.55);
  followDecor.setDepth(10); // fondo

  const DOOR_X = this.WORLD_W * 0.95;
  const DOOR_BASE_Y = h * 0.62; // donde está la base visual 

  const doorDecor = this.add.image(this.WORLD_W * 0.95, h * 0.80, "door")
  .setOrigin(0.5, 1)
  .setScale(0.40 * this.uiScale);

doorDecor.setDepth(50); // encima del bg, detrás del player

  // Estaciones (repartidas en el mundo ancho)
  const stations: Station[] = [
    {
      key: "demo",
      x: this.WORLD_W * 0.10,
      y: h * 0.80,
      label: "Demo",
      blockW: 260, blockH: 150,
      interactW: 360, interactH: 260,
      spriteKey: "demo",
      scale: 0.42,
    },

    {
      key: "crecimiento",
      x: this.WORLD_W * 0.30,
      y: h * 0.65,
      label: "Crecimiento",
      blockW: 220, blockH: 160,
      interactW: 320, interactH: 260,
      spriteKey: "growth",
      scale: 0.42,
    },

    {
      
      key: "seguimiento",
      x: this.WORLD_W * 0.62,
      y: h * 0.82,
      label: "Seguimiento",
      blockW: 170, blockH: 140,
      interactW: 280, interactH: 240,
      spriteKey: "follow",
      scale: 0.22,
      yOffset: 0,
    },

    {
      key: "organizacion",
      x: this.WORLD_W * 0.82,
      y: h * 0.83,
      label: "Organización",
      blockW: 240, blockH: 160,
      interactW: 340, interactH: 260,
      spriteKey: "org",
      scale: 0.42,
    },

    {
  key: "exit" as FeatureKey,
  x: DOOR_X,
  y: this.floorBottom - (300 * this.uiScale),  // centro del trigger en el piso (ajustable)
  label: "Salir",
  blockW: 0,
  blockH: 0,
  interactW: 180,
  interactH: 100,            
  spriteKey: "door",         
  scale: 0.40,
},
  ];

  // Dibujo props + labels
  stations.forEach((s) => {
    if (s.key === ("exit" as any)) return;
  const propY = s.y + (s.yOffset ?? 0);

  let propDepth = propY;

  if (s.spriteKey !== "__none__") {
    const prop = this.add.image(s.x, propY, s.spriteKey)
      .setOrigin(0.5, 1)
      .setScale(s.scale * this.uiScale);

    prop.setDepth(propY);
    propDepth = prop.depth;
  }

  const labelY = (s.labelY ?? propY) - (s.blockH / 2) - 18;

  const label = this.add.text(s.x, labelY, s.label, {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${Math.round(24 * this.uiScale)}px`,
    color: "#333",
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: {
  left: Math.round(8 * this.uiScale),
  right: Math.round(8 * this.uiScale),
  top: Math.round(4 * this.uiScale),
  bottom: Math.round(4 * this.uiScale),
},
  }).setOrigin(0.5);

  label.setDepth(propDepth + 1);
});

  // Player: nace en el piso, centrado
  this.player = this.add.sprite(this.WORLD_W * 0.70, h * 0.88, "player", 0)
  .setOrigin(0.5, 1)
  .setScale(this.PLAYER_BASE * this.uiScale);

  this.player.play("idle");

  this.player.setDepth(this.player.y + 10);

  // Cámara sigue al player
  this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  this.cameras.main.setDeadzone(w * 0.25, h * 0.25);

  // Input
  this.cursors = this.input.keyboard!.createCursorKeys();
  this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

  // Hint
  const hint = this.add.text(0, 0, "⏎ Enter", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${Math.round(14 * this.uiScale)}px`,
    color: "#111",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: { left: 8, right: 8, top: 4, bottom: 4 },
  });
  hint.setOrigin(0.5);
  hint.setVisible(false);
  hint.setScrollFactor(0);
  hint.setDepth(9999); 

  this.registry.set("hint", hint);
  this.registry.set("stations", stations);

  // Lock/unlock
  this.events.on("LOCK", () => { this.locked = true; });

  this.events.on("UNLOCK_AND_BUMP", () => {
    this.locked = false;

    const bump = this.lastMove.clone().scale(-28);
    this.player.x += bump.x;
    this.player.y += bump.y;

    // clamp mundo + piso
    const padX = 18;
    this.player.x = Phaser.Math.Clamp(this.player.x, padX, this.WORLD_W - padX);
    this.player.y = Phaser.Math.Clamp(this.player.y, this.floorTop, this.floorBottom);

    // 2.5D scale
    const base = 0.14 * this.uiScale;
    const depth = Phaser.Math.Clamp((this.player.y - this.floorTop) / (this.floorBottom - this.floorTop), 0, 1);
    this.player.setScale(base + depth * (0.05 * this.uiScale));

    this.nextAllowedAt = this.time.now + 500;
  });

  this.emitToUI({ type: "READY" });
}

  update(_t: number, dt: number) {
  const hint = this.registry.get("hint") as Phaser.GameObjects.Text;
  const stations = this.registry.get("stations") as Station[];
  const now = this.time.now;

  if (this.locked) {
    hint.setVisible(false);
    return;
  }

  const prevX = this.player.x;
  const prevY = this.player.y;

  const d = dt / 1000;
  let vx = 0, vy = 0;

  if (this.cursors.left?.isDown) vx -= 1;
  if (this.cursors.right?.isDown) vx += 1;
  if (this.cursors.up?.isDown) vy -= 1;
  if (this.cursors.down?.isDown) vy += 1;

  if (vx !== 0 || vy !== 0) {
    const len = Math.hypot(vx, vy);
    vx /= len;
    vy /= len;
    this.lastMove.set(vx, vy);
  }

  const moving = vx !== 0 || vy !== 0;

  if (moving) {
    this.player.rotation = 0;
  this.player.anims.play("walk", true);
} else {
      this.player.rotation = 0;
  this.player.anims.play("idle", true);

}

  // Posición lógica 
  let nx = this.player.x + vx * this.speed * d;
  let ny = this.player.y + vy * this.speed * d;

  // Clamp correcto: mundo + piso
  const padX = 18;
  nx = Phaser.Math.Clamp(nx, padX, this.WORLD_W - padX);
  ny = Phaser.Math.Clamp(ny, this.floorTop, this.floorBottom);

  // FOOT (lógico) para colisiones/hover
  const footX = nx;
  const footY = ny;

  // Colisión (usa FOOT lógico) 
  let blocked = false;
  for (const s of stations) {
    if (this.insideAABB(footX, footY, s.x, s.y, s.blockW * this.uiScale, s.blockH * this.uiScale)) {
      blocked = true;
      break;
    }
  }

  if (blocked) {
    // volver
    nx = prevX;
    ny = prevY;
  }

  // aplicar posición base
  this.player.x = nx;
  this.player.y = ny;

  // flip + animación 
  if (moving) {
    if (vx < 0) this.player.setFlipX(false);
    if (vx > 0) this.player.setFlipX(true);
    this.player.rotation = 0;
  }

  this.player.setDepth(ny + 10);

  const base = 0.14;
  const depth = Phaser.Math.Clamp(
  (ny - this.floorTop) / (this.floorBottom - this.floorTop),
  0,
  1
);

this.player.setScale(
  (this.PLAYER_BASE + depth * this.PLAYER_DEPTH_EXTRA) * this.uiScale
);

  this.hoveredFeature = null;
  for (const s of stations) {
    if (this.insideAABB(footX, footY, s.x, s.y, s.interactW * this.uiScale, s.interactH * this.uiScale)) {
      this.hoveredFeature = s.key;
      break;
    }
  }

  // Hint (posicionar basado en ny/foot)
  if (this.hoveredFeature && now >= this.nextAllowedAt) {
    hint.setVisible(true);
    hint.setText((this.hoveredFeature as any) === "exit" ? "⏎ Salir" : "⏎ Enter");
    hint.setPosition(this.player.x, ny - 28);
  } else {
    hint.setVisible(false);
  }

  // Enter para interactuar
  if (
    this.hoveredFeature &&
    now >= this.nextAllowedAt &&
    Phaser.Input.Keyboard.JustDown(this.keyEnter)
  ) {
    if ((this.hoveredFeature as any) === "exit") {
      this.locked = true;
      this.nextAllowedAt = now + 600;

      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.emitToUI({ type: "FEATURE_TRIGGER", feature: this.hoveredFeature! });
      });
      return;
    }

    this.locked = true;
    this.emitToUI({ type: "FEATURE_TRIGGER", feature: this.hoveredFeature });
  }
}
}