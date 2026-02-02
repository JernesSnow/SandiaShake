"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type RolUI = "Admin" | "Colaborador" | "Cliente";

type NavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

/* ===================== BASE NAV ===================== */

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/tareas", label: "Tareas" },
  { href: "/cursos", label: "Cursos" },
  {
    href: "/facturacion",
    label: "Facturación",
    children: [
      { href: "/facturacion", label: "Facturación" },
      { href: "/facturacion/morosidad", label: "Morosidad" },
      { href: "/facturacion/historial", label: "Reporte de pagos" },
    ],
  },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/configuracion", label: "Configuración" },
];

/* ===================== COMPONENT ===================== */

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  /** 🔒 START AS UNKNOWN */
  const [rolLabel, setRolLabel] = useState<RolUI | null>(null);
  const [openFacturacion, setOpenFacturacion] = useState(false);

  /* ===================== LOAD ROLE ===================== */

  useEffect(() => {
    setOpenFacturacion(pathname.startsWith("/facturacion"));

    async function loadRole() {
      const supabase = createSupabaseClient(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const r = (perfil?.rol ?? "").toUpperCase();

      if (r === "ADMIN") setRolLabel("Admin");
      else if (r === "CLIENTE") setRolLabel("Cliente");
      else setRolLabel("Colaborador");
    }

    loadRole();
  }, [pathname]);

  /* ===================== ROLE FILTER ===================== */

  const visibleNavItems = useMemo<NavItem[]>(() => {
    if (!rolLabel) return [];

    if (rolLabel === "Admin") return NAV_ITEMS;

    if (rolLabel === "Colaborador") {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/clientes", label: "Clientes" },
        { href: "/tareas", label: "Tareas" },
        { href: "/cursos", label: "Cursos" },
        { href: "/mi-perfil", label: "Mi Perfil" },
      ];
    }

    // CLIENTE
    return [
      { href: "/dashboard", label: "Dashboard" },
      {
        href: "/facturacion",
        label: "Facturación",
        children: NAV_ITEMS.find((i) => i.href === "/facturacion")?.children,
      },
      { href: "/tareas", label: "Tareas" },
      { href: "/cursos", label: "Cursos" },
      { href: "/mi-organizacion", label: "Mi Organización" },
    ];
  }, [rolLabel]);

  /* ===================== LOGOUT ===================== */

  async function logout() {
    const supabase = createSupabaseClient(true);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  /* ===================== GUARD RENDER ===================== */

  if (!rolLabel) {
    // Optional: return null or a minimal skeleton
    return (
      <aside className="hidden md:flex md:flex-col w-64 h-screen fixed top-0 left-0 bg-gradient-to-b from-[#333132] via-[#2e2c2d] to-[#252324] border-r border-[#444242]" />
    );
  }

  /* ===================== UI ===================== */

  const sidebarContent = (
    <>
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

      <div className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wide text-[#fffef9]/50">
        Navegación
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-1 text-sm">
        {visibleNavItems.map((item) => {
          const hasChildren = !!item.children?.length;

          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (hasChildren &&
              item.children!.some(
                (c) =>
                  pathname === c.href ||
                  pathname.startsWith(c.href + "/")
              ));

          if (hasChildren) {
            const isOpen =
              item.href === "/facturacion" ? openFacturacion : false;

            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFacturacion((v) => !v)}
                  className={clsx(
                    "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-all border-l-4 text-sm",
                    active
                      ? "bg-[#3e3b3c] border-l-[#ee2346] text-[#fffef9] shadow-inner"
                      : "border-l-transparent text-[#fffef9]/80 hover:text-[#fffef9] hover:bg-[#3a3738]"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className={clsx("text-xs transition", isOpen && "rotate-180")}>
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-[#444242] space-y-1">
                    {item.children!.map((child) => {
                      const childActive =
                        pathname === child.href ||
                        pathname.startsWith(child.href + "/");

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={clsx(
                            "block rounded-md px-3 py-2 text-[13px] transition",
                            childActive
                              ? "bg-[#3a3738] text-[#fffef9]"
                              : "text-[#fffef9]/70 hover:text-[#fffef9] hover:bg-[#343132]"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
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
                "flex items-center gap-2 rounded-md px-3 py-2 transition-all border-l-4 text-sm",
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

      <div className="px-4 pb-5 pt-3 border-t border-[#444242] text-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#fffef9]/60">Estado del sistema</span>
          <span className="inline-flex items-center rounded-full bg-[#ee2346] text-[#fffef9] px-2 py-0.5 text-[10px] font-semibold">
            {rolLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full rounded-md border border-[#4a4748]/40 px-3 py-2 text-[12px] font-semibold text-gray-200 hover:bg-[#3a3738] transition"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex md:flex-col w-64 h-screen fixed top-0 left-0 bg-gradient-to-b from-[#333132] via-[#2e2c2d] to-[#252324] text-[#fffef9] border-r border-[#444242] overflow-y-auto z-30">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative flex flex-col w-64 h-full bg-gradient-to-b from-[#333132] via-[#2e2c2d] to-[#252324] text-[#fffef9] border-r border-[#444242] overflow-y-auto shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
