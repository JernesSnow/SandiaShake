// app/tareas/page.tsx
"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE" | null;

const SUBTITLE: Record<Exclude<Role, null>, string> = {
  ADMIN: "Todas las tareas de todos los clientes (vista administrador)",
  COLABORADOR: "Tareas de las organizaciones asignadas a tu usuario",
  CLIENTE: "Tareas de tu organización",
};

export default function TareasPage() {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/profile", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setRole(d?.rol ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--ss-text)]">Tareas</h1>
          {role && (
            <p className="text-xs text-[var(--ss-text3)]">
              {SUBTITLE[role]}
            </p>
          )}
        </div>

        <KanbanBoard />
      </div>
    </>
  );
}
