"use client";

import { useEffect, useState } from "react";
import ClienteDetailClient from "../clientes/[id]/ClienteDetailClient";
import PerfilSection from "@/components/PerfilSection";

type Tab = "organizacion" | "perfil";

export default function MiCuentaPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("organizacion");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/profile", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive) return;
        const id = d?.organizacion?.id_organizacion;
        setOrgId(id ? String(id) : null);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "organizacion", label: "Mi organización" },
    { id: "perfil",       label: "Perfil" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 text-[var(--ss-text)]">Mi cuenta</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[var(--ss-border)] overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
              activeTab === t.id
                ? "border-[#ee2346] text-[var(--ss-text)]"
                : "border-transparent text-[var(--ss-text3)] hover:text-[var(--ss-text2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "organizacion" && (
        loading ? (
          <div className="text-[var(--ss-text3)] text-sm">Cargando organización…</div>
        ) : orgId ? (
          <ClienteDetailClient id={orgId} />
        ) : (
          <div className="text-[var(--ss-text3)] text-sm">No se encontró una organización asociada a tu cuenta.</div>
        )
      )}

      {activeTab === "perfil" && <PerfilSection />}
    </div>
  );
}
