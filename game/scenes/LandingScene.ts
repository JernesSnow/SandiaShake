/**
 * LandingScene.ts
 *
 * Esta escena ya NO se usa en producción.
 * La transición completa (salpicadura + cortina viscosa) vive en LandingHero.tsx
 * con Canvas 2D puro, sin costo extra de Phaser.
 *
 * Se conserva aquí por si en el futuro se quiere embeber la sandía
 * interactiva dentro de un canvas de Phaser (por ejemplo, con física real).
 */

import * as Phaser from "phaser";

export class LandingScene extends Phaser.Scene {
  constructor() {
    super("LandingScene");
  }

  create() {
    // No-op: la lógica de transición vive en React.
  }
}