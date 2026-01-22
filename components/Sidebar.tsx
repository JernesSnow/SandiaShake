"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/tareas", label: "Tareas" },
  { href: "/cursos", label: "Cursos" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/configuracion", label: "Configuración" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [rol, setRol] = useState<"ADMIN" | "COLABORADOR" | "CLIENTE" | null>(null);

  useEffect(() => {
    const r = localStorage.getItem("rol");
    if (r === "ADMIN" || r === "COLABORADOR" || r === "CLIENTE") {
      setRol(r);
    }
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseClient(true);
    await supabase.auth.signOut();

    localStorage.removeItem("rol");

    router.replace("/auth");
  }

  const rolLabel =
    rol === "ADMIN" ? "Admin" :
    rol === "COLABORADOR" ? "Colaborador" :
    "Usuario";

  const rolColor =
    rol === "ADMIN"
      ? "bg-[#ee2346]"
      : "bg-[#7dd3fc]";

  return (
    <aside className="hidden md:flex md:flex-col w-64 min-h-screen bg-gradient-to-b from-[#333132] via-[#2e2c2d] to-[#252324] text-[#fffef9] border-r border-[#444242]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-[#444242] flex justify-center">
        <Image
          src="/mock-logo-sandia-con-chole.png"
          alt="SandiaShake"
          width={160}
          height={40}
          className="object-contain"
          priority
        />
      </div>

      {/* Navegación */}
      <div className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wide text-[#fffef9]/50">
        Navegación
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-all border-l-4",
                active
                  ? "bg-[#3e3b3c] border-l-[#ee2346] text-[#fffef9] shadow-inner"
                  : "border-l-transparent text-[#fffef9]/80 hover:text-[#fffef9] hover:bg-[#3a3738]"
              )}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-[#444242] text-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#fffef9]/60">Rol</span>

          <div className="flex items-center gap-2">
            {/* Rol dinámico */}
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white",
                rolColor
              )}
            >
              {rolLabel}
            </span>

          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-3 py-2 text-[11px] font-semibold text-[#ee2346] hover:bg-[#ee2346]/20 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
