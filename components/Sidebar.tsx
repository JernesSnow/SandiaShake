"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

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

  return (
    <aside
      className="
        hidden md:flex md:flex-col
        w-64 min-h-screen
        bg-gradient-to-b from-[#333132] via-[#2e2c2d] to-[#252324]
        text-[#fffef9]
        border-r border-[#444242]
      "
    >
      {/* Top brand bar */}
      <div className="px-5 pt-5 pb-3 border-b border-[#444242]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[#fffef9]/60">
              Sandía con Chile
            </div>
            <div className="text-xl font-bold tracking-wide">
              SandíaShake CRM
            </div>
          </div>
          {/* Small accent pill using brand red */}
          <span className="inline-flex items-center rounded-full bg-[#ee2346] text-[#fffef9] px-2 py-0.5 text-[10px] font-semibold">
            Admin
          </span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wide text-[#fffef9]/50">
        Navegación
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pb-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);

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

      {/* Footer status using brand green */}
      <div className="px-4 pb-5 pt-3 border-t border-[#444242] text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#fffef9]/60">Estado del sistema</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#6cbe45]/40 bg-[#6cbe45]/15 px-2 py-0.5 text-[10px] font-semibold text-[#6cbe45]">
            ● Online
          </span>
        </div>
      </div>
    </aside>
  );
}
