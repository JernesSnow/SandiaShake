"use client";
import { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: string;
  description?: string;
  size?: "md" | "lg";
  fullHeight?: boolean;
};

export default function KPI({ icon, label, value, accent = "#6cbe45", description, size = "md", fullHeight = false }: Props) {
  const isLg = size === "lg";
  const heightCls = fullHeight ? "h-full" : isLg ? "h-[150px]" : "h-full";
  return (
    <div className={"relative overflow-hidden rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm flex items-center gap-4 " + (isLg ? "p-6 " : "p-5 ") + heightCls}>
      {/* accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accent }} />

      <div
        className={"rounded-xl shrink-0 " + (isLg ? "p-4" : "p-3")}
        style={{ backgroundColor: accent + "20" }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>

      <div className="min-w-0">
        <p className={"font-medium text-[var(--ss-text3)] truncate " + (isLg ? "text-sm" : "text-xs")}>{label}</p>
        <h2 className={"font-bold text-[var(--ss-text)] mt-0.5 tabular-nums " + (isLg ? "text-3xl" : "text-2xl")}>{value}</h2>
        {description && (
          <p className="text-xs text-[var(--ss-text3)] mt-1 leading-snug line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}
