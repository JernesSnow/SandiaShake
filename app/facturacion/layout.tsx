import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar"; // ajustá si tu ruta real es otra

export default function FacturacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#252324] text-[#fffef9]">
      <Sidebar />

      {/* Main content */}
      <main className="md:ml-64 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
