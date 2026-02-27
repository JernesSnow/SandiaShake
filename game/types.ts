export type FeatureKey = "demo" | "organizacion" | "seguimiento" | "crecimiento";

export type GameToUIEvent =
  | { type: "FEATURE_TRIGGER"; feature: FeatureKey }
  | { type: "READY" };