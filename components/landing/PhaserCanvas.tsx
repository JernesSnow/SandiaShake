"use client";

import { useEffect, useRef } from "react";
import type { FeatureKey, GameToUIEvent } from "@/game/types";

export default function PhaserCanvas({
  onFeature,
  modalOpen,
}: {
  onFeature: (k: FeatureKey) => void;
  modalOpen: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);

  // anti-spam
  const lastFeatureRef = useRef<FeatureKey | null>(null);
  const lastAtRef = useRef<number>(0);

  // mantener callback estable
  const onFeatureRef = useRef(onFeature);
  useEffect(() => {
    onFeatureRef.current = onFeature;
  }, [onFeature]);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    async function boot() {
      if (!containerRef.current) return;

      const Phaser = await import("phaser");
      const { OfficeScene } = await import("@/game/scenes/OfficeScene");

      const emitToUI = (evt: GameToUIEvent) => {
        if (cancelled) return;

        if (evt.type === "FEATURE_TRIGGER") {
          const now = Date.now();
          if (lastFeatureRef.current === evt.feature && now - lastAtRef.current < 1200) return;
          lastFeatureRef.current = evt.feature;
          lastAtRef.current = now;

          onFeatureRef.current(evt.feature);
        }
      };

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#f4f4f4",
        scene: [new OfficeScene(emitToUI)],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      phaserRef.current = new Phaser.Game(config);

      // ResizeObserver para mantener tamaño exacto del contenedor
      ro = new ResizeObserver(() => {
        if (!phaserRef.current || !containerRef.current) return;
        phaserRef.current.scale.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      });
      ro.observe(containerRef.current);

      // primer resize + referencia a escena
      setTimeout(() => {
        if (!phaserRef.current || !containerRef.current) return;

        phaserRef.current.scale.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );

        sceneRef.current = phaserRef.current.scene.getScene("OfficeScene");
      }, 0);
    }

    boot();

    return () => {
      cancelled = true;
      ro?.disconnect();
      ro = null;

      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
      sceneRef.current = null;
    };
  }, []);

  // lock/unlock
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modalOpen) scene.events.emit("LOCK");
    else scene.events.emit("UNLOCK_AND_BUMP");
  }, [modalOpen]);

  return <div ref={containerRef} className="w-full h-full" />;
}