import * as Phaser from "phaser";
import type { FeatureKey, GameToUIEvent } from "../types";

type EmitFn = (evt: GameToUIEvent) => void;

type Station = {
  key: FeatureKey;
  x: number;
  y: number;
  label: string;

  // Caja donde NO debe entrar el personaje 
  blockW: number;
  blockH: number;

  // Aura para mostrar hint y permitir Enter
  interactW: number;
  interactH: number;
};

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyEnter!: Phaser.Input.Keyboard.Key;

  private emitToUI: EmitFn;
  private speed = 180;

  private hoveredFeature: FeatureKey | null = null;
  private locked = false;

  private lastMove = new Phaser.Math.Vector2(0, 1);
  private nextAllowedAt = 0;

  constructor(emitToUI: EmitFn) {
    super("OfficeScene");
    this.emitToUI = emitToUI;
  }

  private insideAABB(px: number, py: number, x: number, y: number, w: number, h: number) {
    return Math.abs(px - x) <= w / 2 && Math.abs(py - y) <= h / 2;
  }

  preload() {
  this.load.image("player", window.location.origin + "/assets/PersonajePrincipal.png");
}

  create() {

    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#f4f4f4");

// Pared (arriba)
this.add.rectangle(w / 2, h * 0.14, w, h * 0.30, 0xe84d5b);

// Piso (abajo)
this.add.rectangle(w / 2, h * 0.64, w, h * 0.72, 0xf2f2f2);

// Línea pared/piso (zócalo)
this.add.rectangle(w / 2, h * 0.28, w, 8, 0xffffff);

// Sombrilla suave bajo el zócalo (profundidad)
this.add.rectangle(w / 2, h * 0.29, w, 6, 0x000000, 0.06);;
    

    const stations: Station[] = [
      { key: "demo", x: w * 0.25, y: h * 0.50,  label: "Demo",          blockW: 220, blockH: 140, interactW: 320, interactH: 240 },
      { key: "organizacion", x: w * 0.85, y: h * 0.50, label: "Organización", blockW: 180, blockH: 120, interactW: 280, interactH: 220 },
      { key: "seguimiento", x: w * 0.50, y: h * 0.20, label: "Seguimiento", blockW: 420, blockH: 160, interactW: 520, interactH: 240 },
      { key: "crecimiento",  x: w * 0.55, y: h * 0.50 , label: "Crecimiento",  blockW: 180, blockH: 120, interactW: 280, interactH: 220 },
      { key: "exit" as FeatureKey, x: w * 0.93, y: h * 0.20, label: "Salir", blockW: 120, blockH: 190, interactW: 200, interactH: 260 },
    ];

    // Dibujado placeholder (objeto). Luego lo reemplazo por sprites bonitos.
    stations.forEach((s) => {
      const isExit = (s.key as any) === "exit";

  if (!isExit) {
    // estaciones normales
    this.add.rectangle(s.x, s.y, s.blockW, s.blockH, 0xffffff).setStrokeStyle(2, 0xcccccc);

    this.add.text(s.x, s.y - s.blockH / 2 - 18, s.label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#333",
      backgroundColor: "rgba(255,255,255,0.85)",
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    }).setOrigin(0.5);

    return;
  }

  // ✅ Exit: dibujalo como “puerta” (placeholder simple)
  const door = this.add.rectangle(s.x, s.y, s.blockW, s.blockH, 0xf8f8f8).setStrokeStyle(2, 0x999999);
  this.add.rectangle(s.x, s.y + s.blockH * 0.1, s.blockW * 0.75, s.blockH * 0.7, 0xffffff, 0.6); // panel
  this.add.circle(s.x + s.blockW * 0.25, s.y, 4, 0x666666); // manija

  this.add.text(s.x, s.y - s.blockH / 2 - 18, "Salir", {
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    color: "#333",
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: { left: 8, right: 8, top: 4, bottom: 4 },
  }).setOrigin(0.5);
});

this.player = this.add.image(w * 0.5, h * 0.75, "player");
this.player.setScale(0.12); // ajustar tamaño del personaje
this.player.setOrigin(0.5, 0.5);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Hint
    const hint = this.add.text(0, 0, "⏎ Enter", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#111",
      backgroundColor: "rgba(255,255,255,0.92)",
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    });
    hint.setOrigin(0.5);
    hint.setVisible(false);

    this.registry.set("hint", hint);
    this.registry.set("stations", stations);

    // Lock/unlock desde React
    this.events.on("LOCK", () => { this.locked = true; });

    this.events.on("UNLOCK_AND_BUMP", () => {
      this.locked = false;

      // Empuje hacia atrás (opuesto a la última dirección)
      const bump = this.lastMove.clone().scale(-28);
      this.player.x += bump.x;
      this.player.y += bump.y;

      const pad = 18;
      this.player.x = Phaser.Math.Clamp(this.player.x, pad, this.scale.width - pad);
      this.player.y = Phaser.Math.Clamp(this.player.y, pad, this.scale.height - pad);

      // 2.5D (profundidad): recalcular SIEMPRE
      const base = 0.105;
      const depth = Phaser.Math.Clamp(this.player.y / h, 0, 1);
      this.player.setScale(base + depth * 0.03);

      this.nextAllowedAt = this.time.now + 500;
    });

    this.emitToUI({ type: "READY" });
  }

  update(_t: number, dt: number) {
    const hint = this.registry.get("hint") as Phaser.GameObjects.Text;
    const stations = this.registry.get("stations") as Station[];
    const now = this.time.now;

    // Si modal abierto, no mover y ocultar hint
    if (this.locked) {
      hint.setVisible(false);
      return;
    }

    // Guardar posición anterior para colisiones
    const prevX = this.player.x;
    const prevY = this.player.y;

    // Movimiento
    const d = dt / 1000;
    let vx = 0, vy = 0;

    if (this.cursors.left?.isDown)  vx -= 1;
    if (this.cursors.right?.isDown) vx += 1;
    if (this.cursors.up?.isDown)    vy -= 1;
    if (this.cursors.down?.isDown)  vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.lastMove.set(vx, vy);
    }

    this.player.x += vx * this.speed * d;
    this.player.y += vy * this.speed * d;

    const moving = vx !== 0 || vy !== 0;

if (moving) {
  // flip según dirección horizontal
  if (vx < 0) this.player.setFlipX(false);
  if (vx > 0) this.player.setFlipX(true);

  // bobbing simple
  const t = this.time.now * 0.02;
  this.player.y += Math.sin(t) * 0.25;

  // mini sway
  this.player.rotation = Math.sin(t * 0.5) * 0.01;
} else {
  this.player.rotation = 0;
}

    // clamp
    const pad = 18;
    this.player.x = Phaser.Math.Clamp(this.player.x, pad, this.scale.width - pad);
    this.player.y = Phaser.Math.Clamp(this.player.y, pad, this.scale.height - pad);

    //Bloqueo: evitar que se suba encima del objeto
    let blocked = false;
    for (const s of stations) {
      if (this.insideAABB(this.player.x, this.player.y, s.x, s.y, s.blockW, s.blockH)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      this.player.x = prevX;
      this.player.y = prevY;
    }

    // Hover: detectar aura de interacción
    this.hoveredFeature = null;
    for (const s of stations) {
      if (this.insideAABB(this.player.x, this.player.y, s.x, s.y, s.interactW, s.interactH)) {
        this.hoveredFeature = s.key;
        break;
      }
    }

    // Hint visible solo si hay hover y no cooldown


        if (this.hoveredFeature && now >= this.nextAllowedAt) {
      hint.setVisible(true);
      hint.setText(this.hoveredFeature === ("exit" as any) ? "⏎ Salir" : "⏎ Enter");
      hint.setPosition(this.player.x, this.player.y - 28);
    } else {
      hint.setVisible(false);
    }

        // Enter para interactuar
    if (
      this.hoveredFeature &&
      now >= this.nextAllowedAt &&
      Phaser.Input.Keyboard.JustDown(this.keyEnter)
    ) {
      // SALIR
      if (this.hoveredFeature === ("exit" as any)) {
        this.locked = true;               // bloquea movimiento
        this.nextAllowedAt = now + 600;   // evita doble trigger

        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.time.delayedCall(200, () => {
          this.emitToUI({ type: "FEATURE_TRIGGER", feature: this.hoveredFeature! });
        });
        return;
      }

      // OTRAS ESTACIONES
      this.locked = true;
      this.emitToUI({ type: "FEATURE_TRIGGER", feature: this.hoveredFeature });
    }
  }
}