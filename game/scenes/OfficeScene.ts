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
  private speed = 360;

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

 // Guardamos referencia a stations para usarla en UNLOCK_AND_BUMP
  private stations: Station[] = [];

  constructor(emitToUI: EmitFn) {
    super("OfficeScene");
    this.emitToUI = emitToUI;
  }

  private insideAABB(px: number, py: number, x: number, y: number, w: number, h: number) {
    return Math.abs(px - x) <= w / 2 && Math.abs(py - y) <= h / 2;
  }

  private resolveOverlap(
    px: number, py: number,
    s: Station
  ): { x: number; y: number } {
    const hw = (s.blockW * this.uiScale) / 2;
    const hh = (s.blockH * this.uiScale) / 2;
    const dx = px - s.x;
    const dy = py - s.y;

    // Cuánto hay que empujar en cada eje para salir del bloque
    const overlapX = hw - Math.abs(dx);
    const overlapY = hh - Math.abs(dy);

    // Empujar por el eje con menor overlap (el camino más corto hacia afuera)
    // + 4px de margen para que no quede justo en el borde
    const MARGIN = 4;
    if (overlapX < overlapY) {
      return {
        x: px + (dx >= 0 ? overlapX + MARGIN : -(overlapX + MARGIN)),
        y: py,
      };
    } else {
      return {
        x: px,
        y: py + (dy >= 0 ? overlapY + MARGIN : -(overlapY + MARGIN)),
      };
    }
  }

  preload() {
  //this.load.image("player", window.location.origin + "/assets/PersonajePrincipal.png");
  this.load.image("bg", "/assets/office_bg.png");
  // Spritesheet (6 frames en 3 columnas x 2 filas)
  this.load.spritesheet("player", "/assets/sprite_fixed.png", {
    frameWidth: 256,  
    frameHeight: 256, 
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
  frames: this.anims.generateFrameNumbers("player", {
    start: 0,
    end: 35
  }),
  frameRate: 36,
  repeat: -1
});

  // Tele de Seguimiento ARRIBA (decorativa)
  const followDecor = this.add.image(this.WORLD_W * 0.50, h * 0.22, "follow")
    .setOrigin(0.5, 0.5)
    .setScale(0.55);
  followDecor.setDepth(10); // fondo

 const doorDecor = this.add.image(this.WORLD_W * 0.95, h * 0.80, "door")
      .setOrigin(0.5, 1)
      .setScale(0.40 * this.uiScale)
      .setDepth(50);

    const DOOR_X = this.WORLD_W * 0.95;
  // Estaciones (repartidas en el mundo ancho)
  this.stations = [
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
        y: this.floorBottom - (300 * this.uiScale),
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
  this.stations.forEach((s) => {
      if (s.key === ("exit" as any)) return;
      const propY = s.y + (s.yOffset ?? 0);

      if (s.spriteKey !== "__none__") {
        const prop = this.add.image(s.x, propY, s.spriteKey)
          .setOrigin(0.5, 1)
          .setScale(s.scale * this.uiScale)
          .setDepth(propY);
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
  }).setOrigin(0.5).setDepth(propY + 1);
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

  // Lock/unlock
  this.events.on("LOCK", () => { this.locked = true; });

  this.events.on("UNLOCK_AND_BUMP", () => {
    this.locked = false;

    for (const s of this.stations) {
        const hw = (s.blockW * this.uiScale) / 2;
        const hh = (s.blockH * this.uiScale) / 2;
        if (hw <= 0 || hh <= 0) continue;

        if (this.insideAABB(this.player.x, this.player.y, s.x, s.y, s.blockW * this.uiScale, s.blockH * this.uiScale)) {
          const resolved = this.resolveOverlap(this.player.x, this.player.y, s);
          this.player.x = resolved.x;
          this.player.y = resolved.y;
          break;
        }
      }

    // clamp mundo + piso
    const padX = 18;
    this.player.x = Phaser.Math.Clamp(this.player.x, padX, this.WORLD_W - padX);
    this.player.y = Phaser.Math.Clamp(this.player.y, this.floorTop, this.floorBottom);
    this.nextAllowedAt = this.time.now + 500;
  });

  this.emitToUI({ type: "READY" });
}

  update(_t: number, dt: number) {
  const hint = this.registry.get("hint") as Phaser.GameObjects.Text;
  const now = this.time.now;

  if (this.locked) {
    hint.setVisible(false);
    return;
  }

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

const padX = 18;
    let nx = Phaser.Math.Clamp(this.player.x + vx * this.speed * d, padX, this.WORLD_W - padX);
    let ny = Phaser.Math.Clamp(this.player.y + vy * this.speed * d, this.floorTop, this.floorBottom);

    const blockedFull = this.stations.some(s =>
      this.insideAABB(nx, ny, s.x, s.y, s.blockW * this.uiScale, s.blockH * this.uiScale)
    );

    if (blockedFull) {
      // Intentar solo movimiento horizontal
      const nx2 = nx;
      const ny2 = this.player.y;
      const blockedX = this.stations.some(s =>
        this.insideAABB(nx2, ny2, s.x, s.y, s.blockW * this.uiScale, s.blockH * this.uiScale)
      );

      // Intentar solo movimiento vertical
      const nx3 = this.player.x;
      const ny3 = ny;
      const blockedY = this.stations.some(s =>
        this.insideAABB(nx3, ny3, s.x, s.y, s.blockW * this.uiScale, s.blockH * this.uiScale)
      );

      if (!blockedX) {
        nx = nx2; ny = ny2; // deslizar en X
      } else if (!blockedY) {
        nx = nx3; ny = ny3; // deslizar en Y
      } else {
        nx = this.player.x; ny = this.player.y; // completamente bloqueado
      }
    }

    this.player.x = nx;
    this.player.y = ny;

    if (moving) {
      if (vx < 0) this.player.setFlipX(false);
      if (vx > 0) this.player.setFlipX(true);
      this.player.rotation = 0;
    }

    this.player.setDepth(ny + 10);

    const base = 0.14;
    const depth = Phaser.Math.Clamp(
      (ny - this.floorTop) / (this.floorBottom - this.floorTop),
      0, 1
    );
    this.player.setScale(
      (this.PLAYER_BASE + depth * this.PLAYER_DEPTH_EXTRA) * this.uiScale * 2
    );

    // Hover
    this.hoveredFeature = null;
    for (const s of this.stations) {
      if (this.insideAABB(nx, ny, s.x, s.y, s.interactW * this.uiScale, s.interactH * this.uiScale)) {
        this.hoveredFeature = s.key;
        break;
      }
    }

    if (this.hoveredFeature && now >= this.nextAllowedAt) {
      hint.setVisible(true);
      hint.setText((this.hoveredFeature as any) === "exit" ? "⏎ Salir" : "⏎ Enter");
      hint.setPosition(this.player.x, ny - 28);
    } else {
      hint.setVisible(false);
    }

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