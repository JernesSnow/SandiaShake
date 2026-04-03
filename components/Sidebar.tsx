"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  Grid, Users, CheckSquare, BookOpen, CreditCard,
  AlertCircle, BarChart2, FileText, UserCheck, Settings,
  Folder, Home,
  LogOut, Sun, Moon, ChevronDown,
} from "react-feather";

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[];
  children?: { href: string; label: string; icon: React.ReactNode; roles?: Role[] }[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",      icon: <Grid size={18} />,        roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  { href: "/clientes",     label: "Clientes",        icon: <Users size={18} />,       roles: ["ADMIN","COLABORADOR"] },
  { href: "/tareas",       label: "Tareas",           icon: <CheckSquare size={18} />, roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  { href: "/cursos",       label: "Cursos",           icon: <BookOpen size={18} />,    roles: ["ADMIN","COLABORADOR","CLIENTE"] },
  {
    href: "/facturacion",
    label: "Facturación",
    icon: <CreditCard size={18} />,
    roles: ["ADMIN","CLIENTE"],
    children: [
      { href: "/facturacion",          label: "Facturación",      icon: <CreditCard size={16} />,  roles: ["ADMIN"] },
      { href: "/facturacion/morosidad", label: "Morosidad",       icon: <AlertCircle size={16} />, roles: ["ADMIN"] },
      { href: "/facturacion/historial", label: "Reporte de pagos",icon: <BarChart2 size={16} />,   roles: ["ADMIN"] },
      { href: "/facturacion/mis-facturas", label: "Mis facturas", icon: <FileText size={16} />,    roles: ["CLIENTE"] },
    ],
  },
  { href: "/colaboradores", label: "Colaboradores", icon: <UserCheck size={18} />, roles: ["ADMIN"] },
  { href: "/configuracion", label: "Configuración", icon: <Settings size={18} />,  roles: ["ADMIN"] },
  { href: "/archivos",      label: "Archivos",       icon: <Folder size={18} />,    roles: ["ADMIN","COLABORADOR"] },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function Sidebar({ mobileOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [userRole, setUserRole] = useState<Role | null>(null);
  const [clienteOrg, setClienteOrg] = useState<{ id: number; nombre: string } | null>(null);
  const [openFacturacion, setOpenFacturacion] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        const json = await res.json();
        if (!res.ok) return;
        setUserRole(json.rol);
        if (json.rol === "CLIENTE" && json.organizacion) {
          setClienteOrg({ id: json.organizacion.id_organizacion, nombre: json.organizacion.nombre });
        }
      } catch {}
    }
    loadProfile();
  }, []);

  useEffect(() => {
    setOpenFacturacion(pathname.startsWith("/facturacion"));
  }, [pathname]);

  const filteredNav = useMemo<NavItem[]>(() => {
    if (!userRole) return [];
    const base = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(userRole));
    if (userRole === "CLIENTE" && clienteOrg) {
      return [...base, { href: `/clientes/${clienteOrg.id}`, label: "Mi organización", icon: <Home size={18} />, roles: ["CLIENTE"] as Role[] }];
    }
    return base;
  }, [userRole, clienteOrg]);

  async function logout() {
    const supabase = createSupabaseClient(true);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx(
        "flex items-center justify-center border-b border-[var(--ss-border)]",
        collapsed ? "px-2 py-4" : "px-5 py-4"
      )}>
        {collapsed ? (
          <div className="w-8 h-8 flex items-center justify-center text-xl select-none">
            🍉
          </div>
        ) : (
          <Image
            src="/mock-logo-sandia-con-chole.png"
            alt="SandiaShake"
            width={120}
            height={32}
            priority
            unoptimized
          />
        )}
      </div>

      {/* Burger toggle — below logo */}
      <div className={clsx(
        "flex border-b border-[var(--ss-border)] py-2",
        collapsed ? "justify-center px-2" : "px-3"
      )}>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir" : "Colapsar"}
          className={clsx(
            "flex flex-col gap-[5px] p-2 rounded-lg text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)] transition",
            !collapsed && "w-full"
          )}
        >
          <span className="block w-[18px] h-[2px] rounded-full bg-current" />
          <span className="block w-[18px] h-[2px] rounded-full bg-current" />
          <span className="block w-[14px] h-[2px] rounded-full bg-current" />
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest font-semibold text-[var(--ss-text3)]">
          Navegación
        </div>
      )}

      {/* Nav */}
      <nav className={clsx("flex-1 py-2 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {filteredNav.map((item) => {
          const hasChildren = !!item.children?.length;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          if (hasChildren) {
            const filteredChildren = item.children!.filter((c) => !c.roles || c.roles.includes(userRole!));
            return (
              <div key={item.href}>
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  onClick={() => !collapsed && setOpenFacturacion((v) => !v)}
                  className={clsx(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-[#ee2346]/10 text-[#ee2346]"
                      : "text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)]",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={clsx("transition-transform duration-200", openFacturacion && "rotate-180")}
                      />
                    </>
                  )}
                </button>

                {!collapsed && openFacturacion && (
                  <div className="ml-3 mt-0.5 pl-3 border-l border-[var(--ss-border)] space-y-0.5">
                    {filteredChildren.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={clsx(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                            childActive
                              ? "bg-[#ee2346]/10 text-[#ee2346]"
                              : "text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)]"
                          )}
                        >
                          {child.icon}
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
              title={collapsed ? item.label : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#ee2346]/10 text-[#ee2346]"
                  : "text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)]",
                collapsed && "justify-center px-2"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={clsx("border-t border-[var(--ss-border)] py-3 space-y-1", collapsed ? "px-2" : "px-3")}>
        {/* Role badge */}
        {!collapsed && userRole && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-xs text-[var(--ss-text3)]">Rol</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ee2346] text-white tracking-wide">
              {userRole}
            </span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium w-full transition-all duration-150",
            "text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)]",
            collapsed && "justify-center px-2"
          )}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium w-full transition-all duration-150",
            "text-[var(--ss-text2)] hover:bg-[#ee2346]/10 hover:text-[#ee2346]",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={clsx(
          "hidden md:flex flex-col h-screen fixed top-0 left-0 z-30",
          "bg-ss-sidebar border-r border-[var(--ss-border)]",
          "transition-[width] duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-[64px]" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-[220px] h-full bg-ss-sidebar border-r border-[var(--ss-border)]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
