"use client";

import { useEffect, useState, useRef } from "react";
import { Menu } from "react-feather";
import clsx from "clsx";
import { Sidebar } from "./Sidebar";
import OrganizacionSetupModal from "./OrganizacionSetupModal";
import MembershipBanner from "./MembershipBanner";

export function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
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
      } catch {}
    }
    checkOrg();
  }, []);

  return (
    <div className="min-h-screen bg-ss-bg text-[var(--ss-text)]">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      {/* Main content — shifts based on sidebar width */}
      <div
        className={clsx(
          "flex flex-col min-h-screen transition-[margin-left] duration-300 ease-in-out",
          collapsed ? "md:ml-[64px]" : "md:ml-[220px]"
        )}
      >
        {/* Mobile topbar */}
        <div className="sticky top-0 z-20 flex items-center md:hidden px-4 py-3 border-b border-[var(--ss-border)] bg-ss-sidebar backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-[var(--ss-text2)] hover:text-[var(--ss-text)] transition"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 text-sm font-semibold text-[var(--ss-text)]">SandiaShake</span>
        </div>

        {/* Hide on mobile — handled inline above */}
        <div className="hidden md:block" />

        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <MembershipBanner />
          {children}
        </main>
      </div>

      {showOrgModal && <OrganizacionSetupModal userEmail={userEmail} />}
    </div>
  );
}
