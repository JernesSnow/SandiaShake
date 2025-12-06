"use client";

import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    // Single unified dark background
    <div className="flex min-h-screen bg-[#262425] text-[#fffef9]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main panel */}
      <div className="flex-1 flex flex-col bg-[#333132]">

        <main className="flex-1 p-4 md:p-6">
          {/* Children render directly over dark gray */}
          {children}
        </main>
      </div>
    </div>
  );
}
