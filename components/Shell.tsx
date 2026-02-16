"use client";

import { useEffect, useState } from "react";
import { Menu } from "react-feather";
import { Sidebar } from "./Sidebar";
import OrganizacionSetupModal from "./OrganizacionSetupModal";

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    async function checkOrg() {
      try {
        const res = await fetch("/api/organizacion");
        if (!res.ok) return;
        const data = await res.json();

        if (!data.hasOrg) {
          setUserEmail(data.correo ?? undefined);
          setShowOrgModal(true);
        }
      } catch {
        // Silent fail — don't block the app
      }
    }

    checkOrg();
  }, []);

  return (
    // Single unified dark background
    <div className="min-h-screen bg-[#262425] text-[#fffef9]">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main panel — offset by sidebar width on md+ */}
      <div className="md:ml-64 flex flex-col min-h-screen bg-[#333132]">
        {/* Mobile top bar with hamburger */}
        <div className="sticky top-0 z-20 flex items-center md:hidden px-4 py-3 border-b border-[#444242] bg-[#333132]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-[#fffef9]/80 hover:text-[#fffef9] transition"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 text-sm font-semibold">SandiaShake</span>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mandatory org setup modal for CLIENTE users without org */}
      {showOrgModal && <OrganizacionSetupModal userEmail={userEmail} />}
    </div>
  );
}
