"use client";
import { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: string;
};

export default function KPI({ icon, label, value, accent = "#6cbe45" }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-5 flex items-center gap-4">
      {/* accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accent }} />

      <div
        className="p-3 rounded-xl shrink-0"
        style={{ backgroundColor: accent + "20" }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--ss-text3)] truncate">{label}</p>
        <h2 className="text-2xl font-bold text-[var(--ss-text)] mt-0.5 tabular-nums">{value}</h2>
      </div>
    </div>
  );
}
