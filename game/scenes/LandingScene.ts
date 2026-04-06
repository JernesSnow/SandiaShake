import * as Phaser from "phaser";

export class LandingScene extends Phaser.Scene {
  private sandia!: Phaser.GameObjects.Container;
  private sandiaBody!: Phaser.GameObjects.Ellipse;
  private sandiaText!: Phaser.GameObjects.Text;
  private transitioning = false;

  constructor() {
    super("LandingScene");
  }

  preload() {
    this.load.image("jugo", "/assets/jugo.png");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#f4f4f4");

    // Fondo simple para probar
    this.add.rectangle(width / 2, height / 2, width, height, 0xf4f4f4).setDepth(0);

    // Título de prueba
    this.add.text(width * 0.18, height * 0.28, "Una forma más simple de\nmostrar SandíaShake.", {
      fontFamily: "Arial, sans-serif",
      fontSize: "42px",
      color: "#111111",
      fontStyle: "bold",
      lineSpacing: 8,
    });

    this.add.text(width * 0.18, height * 0.41, "Haz click en la sandía para entrar a una demo interactiva.", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#5b5b5b",
    });

    // Sandía temporal hecha con formas
    this.createSandia(width * 0.72, height * 0.38);

    // Hint suave
    this.tweens.add({
      targets: this.sandiaText,
      alpha: { from: 1, to: 0.45 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createSandia(x: number, y: number) {
    this.sandia = this.add.container(x, y);

    // Borde verde
    const outer = this.add.ellipse(0, 0, 230, 230, 0x00b140);
    // Centro rojo
    this.sandiaBody = this.add.ellipse(0, 0, 180, 180, 0xe52b3a);

    this.sandiaText = this.add.text(0, 0, "Click 🍉", {
      fontFamily: "Arial, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.sandia.add([outer, this.sandiaBody, this.sandiaText]);
    this.sandia.setSize(230, 230);
    this.sandia.setDepth(10);

    // Área interactiva
    this.sandia.setInteractive(
      new Phaser.Geom.Circle(0, 0, 115),
      Phaser.Geom.Circle.Contains
    );

    this.sandia.on("pointerover", () => {
      if (this.transitioning) return;
      this.input.setDefaultCursor("pointer");
      this.tweens.add({
        targets: this.sandia,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 120,
        ease: "Sine.easeOut",
      });
    });

    this.sandia.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      if (this.transitioning) return;
      this.tweens.add({
        targets: this.sandia,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: "Sine.easeOut",
      });
    });

    this.sandia.on("pointerdown", () => {
      if (this.transitioning) return;
      this.transitioning = true;
      this.input.setDefaultCursor("default");
      this.playSandiaOpenAnimation(() => {
        this.playJuiceSplash(() => {
          this.scene.start("OfficeScene");
        });
      });
    });

    // Respiración suave
    this.tweens.add({
      targets: this.sandia,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private playSandiaOpenAnimation(onComplete?: () => void) {
    // Vibración leve
    this.tweens.add({
      targets: this.sandia,
      x: this.sandia.x + 5,
      duration: 40,
      yoyo: true,
      repeat: 5,
      ease: "Sine.easeInOut",
      onComplete: () => {
        const originalX = this.sandia.x;
        const originalY = this.sandia.y;

        this.sandia.destroy();

        // Mitades simples para probar
        const leftHalf = this.add.ellipse(originalX - 20, originalY, 95, 180, 0xe52b3a)
          .setStrokeStyle(12, 0x00b140)
          .setDepth(10);

        const rightHalf = this.add.ellipse(originalX + 20, originalY, 95, 180, 0xe52b3a)
          .setStrokeStyle(12, 0x00b140)
          .setDepth(10);

        this.tweens.add({
          targets: leftHalf,
          x: originalX - 55,
          angle: -10,
          duration: 220,
          ease: "Cubic.easeOut",
        });

        this.tweens.add({
          targets: rightHalf,
          x: originalX + 55,
          angle: 10,
          duration: 220,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.time.delayedCall(80, () => {
              leftHalf.destroy();
              rightHalf.destroy();
              onComplete?.();
            });
          },
        });
      },
    });
  }

  private playJuiceSplash(onComplete?: () => void) {
    const { width, height } = this.scale;

    const jugo = this.add.image(width / 2, -40, "jugo");
    jugo.setOrigin(0.5, 0);
    jugo.setDepth(9999);

    // Ajuste al ancho
    jugo.displayWidth = width * 1.08;
    jugo.scaleY = jugo.scaleX;

    const baseScaleX = jugo.scaleX;
    const baseScaleY = jugo.scaleY;

    jugo.setScale(baseScaleX * 0.82, baseScaleY * 0.82);
    jugo.setAlpha(0);

    this.tweens.add({
      targets: jugo,
      alpha: 1,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      duration: 180,
      ease: "Back.easeOut",
      onComplete: () => {
        this.cameras.main.shake(120, 0.0025);

        this.time.delayedCall(130, () => {
          this.tweens.add({
            targets: jugo,
            y: height,
            duration: 700,
            ease: "Cubic.easeIn",
            onComplete: () => {
              jugo.destroy();
              onComplete?.();
            },
          });
        });
      },
    });
  }
}