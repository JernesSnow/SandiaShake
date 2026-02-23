"use client";

import { useEffect, useState, useRef } from "react";
import { Menu } from "react-feather";
import { Sidebar } from "./Sidebar";
import OrganizacionSetupModal from "./OrganizacionSetupModal";

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return; // 🔥 prevents duplicate dev calls
    hasCheckedRef.current = true;

    async function checkOrg() {
      try {
        const res = await fetch("/api/auth/profile");
        if (!res.ok) return;

        const data = await res.json();

        if (data.rol === "CLIENTE" && !data.organizacion) {
          setUserEmail(undefined);
          setShowOrgModal(true);
        }
      } catch (e) {
        console.error("Shell org check error:", e);
      }
    }

    checkOrg();
  }, []);

  return (
    <div className="min-h-screen bg-[#262425] text-[#fffef9]">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="md:ml-64 flex flex-col min-h-screen bg-[#333132]">
        <div className="sticky top-0 z-20 flex items-center md:hidden px-4 py-3 border-b border-[#444242] bg-[#333132]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-[#fffef9]/80 hover:text-[#fffef9] transition"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 text-sm font-semibold">
            SandiaShake
          </span>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {showOrgModal && (
        <OrganizacionSetupModal userEmail={userEmail} />
      )}
    </div>
  );
}