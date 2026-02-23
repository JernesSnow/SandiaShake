"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE";

type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
  children?: {
    href: string;
    label: string;
    roles?: Role[];
  }[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  { href: "/clientes", label: "Clientes", roles: ["ADMIN"] },
  { href: "/tareas", label: "Tareas", roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  { href: "/cursos", label: "Cursos", roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  {
    href: "/facturacion",
    label: "Facturación",

    roles: ["ADMIN","CLIENTE"],
    children: [
      { href: "/facturacion", label: "Facturación", roles: ["ADMIN"] },
      { href: "/facturacion/morosidad", label: "Morosidad", roles: ["ADMIN"] },
      { href: "/facturacion/historial", label: "Reporte de pagos", roles: ["ADMIN"] },
      { href: "/facturacion/mis-facturas", label: "Mis facturas", roles: ["ADMIN","CLIENTE"] },
    ],
  },
  { href: "/colaboradores", label: "Colaboradores", roles: ["ADMIN"] },
  { href: "/configuracion", label: "Configuración", roles: ["ADMIN"] },
  { href: "/archivos", label: "Archivos", roles: ["ADMIN","COLABORADOR"] },
];

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [userRole, setUserRole] = useState<Role | null>(null);
  const [clienteOrg, setClienteOrg] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  const [openFacturacion, setOpenFacturacion] = useState(false);

  /* =========================================================
     Load profile ONCE
  ========================================================= */

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        const json = await res.json();

        if (!res.ok) return;

        setUserRole(json.rol);

        if (json.rol === "CLIENTE" && json.organizacion) {
          setClienteOrg({
            id: json.organizacion.id_organizacion,
            nombre: json.organizacion.nombre,
          });
        }
      } catch (err) {
        console.error("Sidebar profile error:", err);
      }
    }

    loadProfile();
  }, []);

  /* =========================================================
     Auto expand Facturación if inside route
  ========================================================= */

  useEffect(() => {
    setOpenFacturacion(pathname.startsWith("/facturacion"));
  }, [pathname]);

  /* =========================================================
     Navigation Filtering
  ========================================================= */

  const filteredNav = useMemo<NavItem[]>(() => {
    if (!userRole) return [];

      const baseItems: NavItem[] = NAV_ITEMS.filter(
      (item) => !item.roles || item.roles.includes(userRole)
    );

    // CLIENTE → Add "Mi organización"
    if (userRole === "CLIENTE" && clienteOrg) {
    const miOrg: NavItem = {
      href: `/clientes/${clienteOrg.id}`,
      label: "Mi organización",
      roles: ["CLIENTE"],
    };

    return [...baseItems, miOrg];
  }

  return baseItems;
}, [userRole, clienteOrg]);

  /* =========================================================
     Logout
  ========================================================= */

  async function logout() {
    const supabase = createSupabaseClient(true);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  /* =========================================================
     Sidebar UI
  ========================================================= */

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-[#444242] flex justify-center">
        <Image
          src="/mock-logo-sandia-con-chole.png"
          alt="SandiaShake"
          width={160}
          height={40}
          style={{ width: "auto", height: "auto" }} // Fix Next.js warning
          priority
        />
      </div>

      {/* Section Title */}
      <div className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wide text-[#fffef9]/50">
        Navegación
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1 text-sm">
        {filteredNav.map((item) => {
          const hasChildren = !!item.children?.length;

          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          if (hasChildren) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFacturacion((v) => !v)}
                  className={clsx(
                    "w-full flex items-center justify-between rounded-md px-3 py-2 border-l-4 transition",
                    active
                      ? "bg-[#3e3b3c] border-l-[#ee2346]"
                      : "border-l-transparent hover:bg-[#3a3738]"
                  )}
                >
                  {item.label}
                </button>

                {openFacturacion && (
                  <div className="ml-3 pl-3 border-l border-[#444242] space-y-1">
                    {item.children!
                      .filter(
                        (c) =>
                          !c.roles || c.roles.includes(userRole!)
                      )
                      .map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className="block px-3 py-2 rounded-md hover:bg-[#343132] transition"
                        >
                          {child.label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                "block px-3 py-2 rounded-md border-l-4 transition",
                active
                  ? "bg-[#3e3b3c] border-l-[#ee2346]"
                  : "border-l-transparent hover:bg-[#3a3738]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-[#444242] text-xs">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[#fffef9]/60">Rol</span>
          <span className="bg-[#ee2346] px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {userRole ?? "-"}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-md border px-3 py-2 hover:bg-[#3a3738] transition"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 h-screen fixed bg-[#333132] text-white">
        {sidebarContent}
      </aside>

      {/* Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <aside className="relative w-64 h-full bg-[#333132]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}