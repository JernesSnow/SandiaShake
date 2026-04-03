"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import PlanesEntregablesSection from "@/components/configuracion/PlanesEntregablesSection";
import RewardsSection from "@/components/configuracion/RewardsSection";

import {
  User, Mail, Lock, Users, Plus, Edit2, Trash2,
  Link as LinkIcon, Database, Cloud, CheckCircle,
  Eye, EyeOff, RefreshCw, X,
} from "react-feather";

/* ─── types ─── */

export type RolUsuario    = "Admin" | "Colaborador" | "Cliente";
export type EstadoUsuario = "Activo" | "Suspendido";
export type AdminNivel    = "PRIMARIO" | "SECUNDARIO" | null;

export type UsuarioSistema = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  adminNivel?: AdminNivel;
};

type Tab = "perfil" | "usuarios" | "planes" | "integraciones" | "sistema";

/* ─── helpers ─── */

function rolDbToUi(rol: string): RolUsuario {
  const r = (rol ?? "").toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "COLABORADOR") return "Colaborador";
  return "Cliente";
}
function rolUiToDb(rol: RolUsuario) {
  if (rol === "Admin") return "ADMIN";
  if (rol === "Colaborador") return "COLABORADOR";
  return "CLIENTE";
}
function estadoDbToUi(estado: string): EstadoUsuario {
  return (estado ?? "").toUpperCase() === "ACTIVO" ? "Activo" : "Suspendido";
}
function estadoUiToDb(estado: EstadoUsuario) {
  return estado === "Activo" ? "ACTIVO" : "INACTIVO";
}
function safeJson(text: string) {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

const cardCls =
  "rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm";

/* ─── rol badge ─── */
function RolBadge({ rol }: { rol: RolUsuario }) {
  const cls =
    rol === "Admin"
      ? "bg-[#ee2346]/15 text-[#ee2346] border-[#ee2346]/30"
      : rol === "Colaborador"
      ? "bg-[#7dd3fc]/15 text-[#0ea5e9] dark:text-[#7dd3fc] border-[#7dd3fc]/30"
      : "bg-[#6cbe45]/15 text-[#6cbe45] border-[#6cbe45]/30";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      {rol}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════ */

export default function ConfiguracionPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  /* profile */
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileMsg, setProfileMsg]   = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  /* users */
  const [usuarios, setUsuarios]           = useState<UsuarioSistema[]>([]);
  const [userSearch, setUserSearch]       = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<RolUsuario | "Todos">("Todos");
  const [editingUser, setEditingUser]     = useState<UsuarioSistema | null>(null);
  const [isNewUser, setIsNewUser]         = useState(false);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [usersErr, setUsersErr]           = useState<string | null>(null);
  const [noAuth, setNoAuth]               = useState(false);

  /* drive */
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveExpired, setDriveExpired]     = useState(false);
  const [driveEmail, setDriveEmail]         = useState("");

  /* db / hosting */
  const [dbProvider, setDbProvider]         = useState("Supabase (PostgreSQL)");
  const [dbRealtime, setDbRealtime]         = useState(true);
  const [dbRls, setDbRls]                   = useState(true);
  const [hostingProvider, setHostingProvider] = useState("Railway");
  const [envMode, setEnvMode]               = useState<"Testing" | "Production">("Testing");

  /* ── load profile ── */
  useEffect(() => {
    fetch("/api/mi-perfil", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setName(d.nombre ?? ""); setEmail(d.correo ?? ""); } })
      .catch(() => {});
  }, []);

  /* ── load drive ── */
  useEffect(() => {
    if (searchParams.get("drive") === "connected") {
      setDriveConnected(true); setDriveExpired(false);
    }
    fetch("/api/google-drive/status")
      .then(r => r.json())
      .then(d => { setDriveConnected(d.connected); setDriveExpired(d.expired ?? false); setDriveEmail(d.google_email ?? ""); })
      .catch(() => {});
  }, [searchParams]);

  /* ── load users ── */
  async function cargarUsuarios() {
    setLoadingUsers(true); setUsersErr(null); setNoAuth(false);
    try {
      const res  = await fetch("/api/admin/usuarios", { credentials: "include", cache: "no-store" });
      const text = await res.text();
      const json = safeJson(text);
      if (res.status === 401) { setNoAuth(true); setUsersErr(json?.error ?? "No autenticado."); return; }
      if (!res.ok) { setUsersErr(json?.error ?? "No se pudieron cargar usuarios."); return; }
      setUsuarios((json?.usuarios ?? []).map((u: any) => ({
        id: String(u.id_usuario), nombre: u.nombre ?? "", correo: u.correo ?? "",
        rol: rolDbToUi(u.rol), estado: estadoDbToUi(u.estado), adminNivel: u.admin_nivel ?? null,
      })));
    } catch { setUsersErr("Error cargando usuarios."); }
    finally { setLoadingUsers(false); }
  }
  useEffect(() => { cargarUsuarios(); }, []);

  const filteredUsuarios = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    return usuarios.filter(u => {
      const matchSearch = !s || u.nombre.toLowerCase().includes(s) || u.correo.toLowerCase().includes(s);
      const matchRole   = userRoleFilter === "Todos" || u.rol === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [usuarios, userSearch, userRoleFilter]);

  /* ── profile save ── */
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setProfileMsg(null);
    if (!name.trim()) { setProfileMsg("El nombre no puede estar vacío."); return; }
    const wantsPwd = !!(currentPwd || newPwd || confirmPwd);
    if (wantsPwd) {
      if (!currentPwd || !newPwd || !confirmPwd) { setProfileMsg("Completá todos los campos de contraseña."); return; }
      if (newPwd.length < 8) { setProfileMsg("La nueva contraseña debe tener al menos 8 caracteres."); return; }
      if (newPwd !== confirmPwd) { setProfileMsg("Las contraseñas no coinciden."); return; }
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/mi-perfil", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name.trim(), currentPassword: currentPwd || undefined, newPassword: newPwd || undefined, confirmPassword: confirmPwd || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setProfileMsg(json.message || "Error al actualizar el perfil."); return; }
      setProfileMsg(wantsPwd ? "Contraseña actualizada." : "Perfil actualizado.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch { setProfileMsg("Error inesperado."); }
    finally { setProfileSaving(false); }
  }

  /* ── user CRUD ── */
  function openNewUser() {
    setIsNewUser(true);
    setEditingUser({ id: "", nombre: "", correo: "", rol: "Colaborador", estado: "Activo", adminNivel: "SECUNDARIO" });
  }

  async function saveUser(u: UsuarioSistema) {
    if (!u.nombre.trim() || !u.correo.trim()) { alert("Nombre y correo son obligatorios."); return; }
    if (isNewUser) {
      if (u.rol === "Cliente") { alert("Para crear Clientes usá el flujo separado de clientes."); return; }
      const res  = await fetch("/api/admin/crear-usuario", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: u.nombre, correo: u.correo, rol: rolUiToDb(u.rol), admin_nivel: u.rol === "Admin" ? (u.adminNivel ?? "SECUNDARIO") : null }) });
      const json = safeJson(await res.text());
      if (!res.ok) { alert(json?.error ?? "No se pudo crear el usuario."); return; }
    } else {
      if (!u.id || !/^\d+$/.test(u.id)) { alert("ID inválido"); return; }
      const res  = await fetch(`/api/admin/usuarios/${u.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: u.nombre, correo: u.correo, rol: rolUiToDb(u.rol), admin_nivel: u.rol === "Admin" ? (u.adminNivel ?? "SECUNDARIO") : null, estado: estadoUiToDb(u.estado) }) });
      const json = safeJson(await res.text());
      if (!res.ok) { alert(json?.error ?? "No se pudo actualizar el usuario."); return; }
    }
    await cargarUsuarios(); setEditingUser(null); setIsNewUser(false);
  }

  async function softDeleteUser(id: string) {
    if (!id || !/^\d+$/.test(id)) { alert("ID inválido"); return; }
    const res  = await fetch(`/api/admin/usuarios/${id}/desactivar`, { method: "POST", credentials: "include" });
    const json = safeJson(await res.text());
    if (!res.ok) { alert(json?.error ?? "No se pudo desactivar."); return; }
    await cargarUsuarios(); setEditingUser(null); setIsNewUser(false);
  }

  /* ── tabs config ── */
  const TABS: { id: Tab; label: string }[] = [
    { id: "perfil",         label: "Perfil" },
    { id: "usuarios",       label: "Usuarios" },
    { id: "planes",         label: "Planes & Rewards" },
    { id: "integraciones",  label: "Integraciones" },
    { id: "sistema",        label: "Sistema" },
  ];

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-[var(--ss-text)]">Configuración</h1>

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

      {/* ═══════ PERFIL ═══════ */}
      {activeTab === "perfil" && (
        <div className={cardCls + " p-6"}>
          <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
            <User size={16} className="text-[#6cbe45]" /> Información del perfil
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5"><Mail size={13} /> Nombre completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5"><Mail size={13} /> Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--ss-border)]">
              <h3 className="text-sm font-semibold text-[var(--ss-text)] mb-4 flex items-center gap-2">
                <Lock size={15} /> Cambiar contraseña
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Contraseña actual", val: currentPwd, setVal: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(s => !s) },
                  { label: "Nueva contraseña",   val: newPwd,     setVal: setNewPwd,     show: showNew,     toggle: () => setShowNew(s => !s)     },
                  { label: "Confirmar contraseña",val: confirmPwd, setVal: setConfirmPwd, show: showConfirm, toggle: () => setShowConfirm(s => !s) },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ss-text2)] block">{f.label}</label>
                    <div className="relative">
                      <input type={f.show ? "text" : "password"} value={f.val} onChange={e => f.setVal(e.target.value)} className={inputCls + " pr-10"} />
                      <button type="button" onClick={f.toggle} className="absolute inset-y-0 right-0 px-3 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                        {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {profileMsg && (
              <div className={`rounded-xl px-4 py-2.5 text-xs border ${profileMsg.includes("actualiz") ? "bg-[#6cbe45]/10 border-[#6cbe45]/30 text-[#6cbe45]" : "bg-[#ee2346]/10 border-[#ee2346]/25 text-[#ee2346]"}`}>
                {profileMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={profileSaving} className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition">
                {profileSaving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════ USUARIOS ═══════ */}
      {activeTab === "usuarios" && (
        <div className={cardCls + " p-6"}>
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--ss-text)] flex items-center gap-2">
                <Users size={16} className="text-[#7dd3fc]" /> Gestión de usuarios
              </h2>
              <p className="text-[11px] text-[var(--ss-text3)] mt-0.5">Administradores, colaboradores y clientes del sistema.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={cargarUsuarios} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ss-border)] px-3 py-2 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition">
                <RefreshCw size={13} className={loadingUsers ? "animate-spin" : ""} /> Recargar
              </button>
              <button type="button" onClick={openNewUser} className="inline-flex items-center gap-1.5 rounded-xl bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-xs font-semibold text-white transition">
                <Plus size={14} /> Nuevo usuario
              </button>
            </div>
          </div>

          {usersErr && (
            <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/25 px-4 py-2.5 text-xs text-[#ee2346] mb-4 flex items-center justify-between gap-3">
              <span>{usersErr}</span>
              {noAuth && <button type="button" onClick={() => router.push("/auth")} className="shrink-0 underline underline-offset-2">Iniciar sesión</button>}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-[var(--ss-text2)] block">Buscar</label>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Nombre o correo…" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--ss-text2)] block">Filtrar por rol</label>
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value as RolUsuario | "Todos")} className={inputCls}>
                <option value="Todos">Todos</option>
                <option value="Admin">Admin</option>
                <option value="Colaborador">Colaborador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--ss-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--ss-raised)] text-[var(--ss-text3)] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Correo</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-[var(--ss-text3)]">Cargando…</td></tr>
                )}
                {!loadingUsers && filteredUsuarios.map(u => (
                  <tr key={u.id} className="border-t border-[var(--ss-border)] hover:bg-[var(--ss-overlay)] transition">
                    <td className="px-4 py-3 text-[var(--ss-text)] font-medium whitespace-nowrap">{u.nombre}</td>
                    <td className="px-4 py-3 text-[var(--ss-text2)] whitespace-nowrap">{u.correo}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><RolBadge rol={u.rol} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${u.estado === "Activo" ? "bg-[#6cbe45]/15 text-[#6cbe45] border-[#6cbe45]/30" : "bg-[#ee2346]/15 text-[#ee2346] border-[#ee2346]/30"}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => { setIsNewUser(false); setEditingUser({ ...u }); }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--ss-border)] px-2.5 py-1.5 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition">
                          <Edit2 size={12} /> Editar
                        </button>
                        <button type="button" onClick={() => softDeleteUser(u.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#ee2346]/30 bg-[#ee2346]/10 px-2.5 py-1.5 text-xs text-[#ee2346] hover:bg-[#ee2346]/20 transition">
                          <Trash2 size={12} /> Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingUsers && filteredUsuarios.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--ss-text3)]">No hay usuarios que coincidan con los filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ PLANES & REWARDS ═══════ */}
      {activeTab === "planes" && (
        <div className="space-y-5">
          <PlanesEntregablesSection />
          <RewardsSection />
        </div>
      )}

      {/* ═══════ INTEGRACIONES ═══════ */}
      {activeTab === "integraciones" && (
        <div className={cardCls + " p-6"}>
          <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
            <LinkIcon size={16} className="text-[#7dd3fc]" /> Google Drive
          </h2>

          {driveExpired ? (
            <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/25 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ee2346]" />
                <span className="text-sm font-semibold text-[#ee2346]">Token expirado</span>
              </div>
              <p className="text-xs text-[var(--ss-text2)]">La conexión con Google Drive ha expirado. Reconectá para seguir usando la integración.</p>
              <button type="button" onClick={() => { window.location.href = "/api/oauth2/connect"; }} className="inline-flex items-center gap-2 rounded-xl bg-[#ee2346] hover:bg-[#d8203f] px-4 py-2 text-sm font-semibold text-white transition">
                Reconectar Google Drive
              </button>
            </div>
          ) : driveConnected ? (
            <div className="rounded-xl bg-[#6cbe45]/10 border border-[#6cbe45]/25 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#6cbe45]" />
                <span className="text-sm font-semibold text-[#6cbe45]">Google Drive conectado</span>
              </div>
              {driveEmail && <p className="text-xs text-[var(--ss-text2)]">Cuenta: <span className="text-[#7dd3fc] font-medium">{driveEmail}</span></p>}
              <p className="text-xs text-[var(--ss-text3)]">Los archivos se almacenan automáticamente. Explorá desde <a href="/archivos" className="text-[#7dd3fc] hover:underline">Archivos</a>.</p>
              <button type="button" onClick={() => { window.location.href = "/api/oauth2/connect"; }} className="inline-flex items-center gap-2 rounded-xl border border-[var(--ss-border)] px-4 py-2 text-sm text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition">
                Conectar con otra cuenta
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--ss-text3)]" />
                <span className="text-sm font-medium text-[var(--ss-text2)]">Google Drive no conectado</span>
              </div>
              <p className="text-xs text-[var(--ss-text3)]">Conectá tu cuenta de Google para almacenar archivos de tareas directamente en tu Drive. Se crearán carpetas automáticas por organización y tarea.</p>
              <button type="button" onClick={() => { window.location.href = "/api/oauth2/connect"; }} className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Conectar Google Drive
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ SISTEMA ═══════ */}
      {activeTab === "sistema" && (
        <div className="space-y-5">
          {/* Database */}
          <div className={cardCls + " p-6"}>
            <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
              <Database size={16} className="text-[#6cbe45]" /> Base de datos
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-2">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Proveedor</label>
                <input value={dbProvider} onChange={e => setDbProvider(e.target.value)} className={inputCls} />
                <p className="text-[11px] text-[var(--ss-text3)]">Recomendado: Supabase (PostgreSQL) por Auth + RLS + escalabilidad.</p>
              </div>
              <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-3">
                {[
                  { label: "Realtime habilitado", val: dbRealtime, set: setDbRealtime },
                  { label: "Row Level Security (RLS)", val: dbRls,      set: setDbRls      },
                ].map(f => (
                  <label key={f.label} className="flex items-center gap-3 text-sm text-[var(--ss-text2)] cursor-pointer">
                    <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)} className="rounded border-[var(--ss-border)] text-[#6cbe45] focus:ring-[#6cbe45]" />
                    {f.label}
                  </label>
                ))}
                <p className="text-[11px] text-[var(--ss-text3)]">RLS asegura que cada rol solo vea lo permitido.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => alert("Guardar DB (pendiente)")} className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2.5 text-sm font-semibold text-white transition">
                Guardar base de datos
              </button>
            </div>
          </div>

          {/* Hosting */}
          <div className={cardCls + " p-6"}>
            <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
              <Cloud size={16} className="text-[#7dd3fc]" /> Hosting
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-2">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Proveedor</label>
                <input value={hostingProvider} onChange={e => setHostingProvider(e.target.value)} className={inputCls} />
                <p className="text-[11px] text-[var(--ss-text3)]">Sugerido: Railway para test y prod con despliegue por ramas.</p>
              </div>
              <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-2">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Entorno activo</label>
                <select value={envMode} onChange={e => setEnvMode(e.target.value as "Testing" | "Production")} className={inputCls}>
                  <option value="Testing">Testing</option>
                  <option value="Production">Production</option>
                </select>
                <p className="text-[11px] text-[var(--ss-text3)]">Testing: rama de pruebas · Production: rama main.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => alert("Guardar hosting (pendiente)")} className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2.5 text-sm font-semibold text-white transition">
                Guardar hosting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ USER MODAL ═══════ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--ss-border)] flex items-center justify-between">
              <h3 className="text-[var(--ss-text)] font-semibold">{isNewUser ? "Nuevo usuario" : "Editar usuario"}</h3>
              <button type="button" onClick={() => { setEditingUser(null); setIsNewUser(false); }} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Nombre</label>
                <input value={editingUser.nombre} onChange={e => setEditingUser(p => p ? { ...p, nombre: e.target.value } : p)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Correo</label>
                <input value={editingUser.correo} onChange={e => setEditingUser(p => p ? { ...p, correo: e.target.value } : p)} className={inputCls} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--ss-text2)] block">Rol</label>
                  <select value={editingUser.rol} onChange={e => setEditingUser(p => p ? { ...p, rol: e.target.value as RolUsuario } : p)} className={inputCls}>
                    <option value="Admin">Admin</option>
                    <option value="Colaborador">Colaborador</option>
                    <option value="Cliente">Cliente</option>
                  </select>
                </div>
                {editingUser.rol === "Admin" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ss-text2)] block">Nivel Admin</label>
                    <select value={editingUser.adminNivel ?? "SECUNDARIO"} onChange={e => setEditingUser(p => p ? { ...p, adminNivel: e.target.value as "PRIMARIO" | "SECUNDARIO" } : p)} className={inputCls}>
                      <option value="PRIMARIO">Primario</option>
                      <option value="SECUNDARIO">Secundario</option>
                    </select>
                  </div>
                )}
                {!isNewUser && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ss-text2)] block">Estado</label>
                    <select value={editingUser.estado} onChange={e => setEditingUser(p => p ? { ...p, estado: e.target.value as EstadoUsuario } : p)} className={inputCls}>
                      <option value="Activo">Activo</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--ss-border)]">
                {!isNewUser && (
                  <button type="button" onClick={() => softDeleteUser(editingUser.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#ee2346]/35 bg-[#ee2346]/10 px-3 py-2 text-sm font-semibold text-[#ee2346] hover:bg-[#ee2346]/15 transition">
                    <Trash2 size={14} /> Desactivar
                  </button>
                )}
                <button type="button" onClick={() => saveUser(editingUser)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-sm font-semibold text-white transition">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
