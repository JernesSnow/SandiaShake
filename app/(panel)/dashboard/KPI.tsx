"use client";
import { ReactNode } from "react";

export default function KPI({ icon, label, value }: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow flex items-center gap-4">
      <div className="p-3 bg-black/20 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <h2 className="text-3xl font-bold text-white mt-1">{value}</h2>
      </div>
    </div>
  );
}
