"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle,
  Edit2,
  Heart,
  List,
  Plus,
  Search,
  Trash2,
  User,
} from "react-feather";

/* ===================== TYPES ===================== */

type MentalState = "Estable" | "Atento" | "En riesgo";

type RolColaborador =
  | "Admin"
  | "Estratega"
  | "Ejecutivo de cuenta"
  | "Diseñador"
  | "Editor"
  | "Community Manager";

type EstadoCuenta = "Activo" | "Suspendido";

type UsuarioDB = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: "ADMIN" | "COLABORADOR";
  admin_nivel: "PRIMARIO" | "SECUNDARIO" | null;
  estado: "ACTIVO" | "SUSPENDIDO";
};

export type Colaborador = {
  id: number;
  nombre: string;
  rol: RolColaborador; // UI role label (Admin vs Colab role label)
  email: string;

  esAdmin: boolean;
  esAdminPrimario: boolean;

  estadoCuenta: EstadoCuenta;
  mentalState: MentalState;
  ultimaRevision: string;

  clientesAsignados: string[];

  // Stats (por ahora placeholders si no tienes tablas de KPIs listas)
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  porcentajeAprobacion: number; // 0-100
  chilliPoints: number;
  chilliPointsMes: number;

  // opcional
  notas?: string;
};

type FiltroEstado = "Todos" | EstadoCuenta;
type FiltroMental = "Todos" | MentalState;

/* ===================== THEME ===================== */

const palette = {
  dark: "#333132",
  darkSoft: "#3d3b3c",
  darkLighter: "#4a4748",
  light: "#fffef9",
  alert: "#ee2346",
  success: "#6cbe45",
};

function getEstadoBadgeClasses(estado: EstadoCuenta) {
  return estado === "Activo"
    ? "bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/50"
    : "bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50";
}

function getMentalClasses(mental: MentalState) {
  switch (mental) {
    case "Estable":
      return "bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/50";
    case "Atento":
      return "bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/50";
    case "En riesgo":
      return "bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50";
  }
}

/* ===================== MAPPERS ===================== */

function mapDbToUi(u: UsuarioDB): Colaborador {
  const esAdmin = u.rol === "ADMIN";
  const esAdminPrimario = esAdmin && u.admin_nivel === "PRIMARIO";

  return {
    id: u.id_usuario,
    nombre: u.nombre,
    email: u.correo,

    // si es ADMIN -> "Admin"; si no, default "Ejecutivo de cuenta"
    rol: esAdmin ? "Admin" : "Ejecutivo de cuenta",

    esAdmin,
    esAdminPrimario,

    estadoCuenta: u.estado === "ACTIVO" ? "Activo" : "Suspendido",

    // estos puedes luego persistir en tablas reales
    mentalState: "Estable",
    ultimaRevision: new Date().toISOString().slice(0, 10),

    clientesAsignados: [],

    totalTareas: 0,
    tareasPendientes: 0,
    tareasAprobadas: 0,
    porcentajeAprobacion: 0,
    chilliPoints: 0,
    chilliPointsMes: 0,

    notas: "",
  };
}

/* ===================== PAGE ===================== */

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos");
  const [filtroMental, setFiltroMental] = useState<FiltroMental>("Todos");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // edit modal
  const [openEditar, setOpenEditar] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState<"ADMIN" | "COLABORADOR">("COLABORADOR");
  const [guardando, setGuardando] = useState(false);

  // create modal (opcional: depende de tu endpoint real)
  const [openNuevo, setOpenNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"ADMIN" | "COLABORADOR">("COLABORADOR");

  /* ---------------- LOAD USERS ---------------- */

  async function cargarUsuarios() {
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/usuarios", { credentials: "include" });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Error cargando usuarios");
        setColaboradores([]);
        setSeleccionado(null);
        return;
      }

      const lista: Colaborador[] = (json.usuarios ?? []).map(mapDbToUi);
      setColaboradores(lista);

      setSeleccionado((prev) => {
        if (prev && lista.some((x) => x.id === prev.id)) {
          return lista.find((x) => x.id === prev.id) ?? prev;
        }
        return lista[0] ?? null;
      });
    } catch {
      setError("Error cargando usuarios");
      setColaboradores([]);
      setSeleccionado(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  /* ---------------- LOAD ORGANIZACIONES (CLIENTES) ---------------- */

  async function cargarOrganizacionesParaUsuario(idUsuario: number) {
    try {
      const res = await fetch(`/api/admin/usuarios/${idUsuario}/organizaciones`, {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        // deja vacío pero muestra error genérico arriba si quieres
        return;
      }

      const orgs: string[] = json.organizaciones ?? [];

      setColaboradores((prev) =>
        prev.map((c) => (c.id === idUsuario ? { ...c, clientesAsignados: orgs } : c))
      );

      setSeleccionado((prev) => {
        if (!prev || prev.id !== idUsuario) return prev;
        return { ...prev, clientesAsignados: orgs };
      });
    } catch {
      // no rompas la UI si falla
    }
  }

  // cada vez que seleccionas uno, trae sus organizaciones si aún no están
  useEffect(() => {
    if (!seleccionado) return;
    if (seleccionado.clientesAsignados && seleccionado.clientesAsignados.length > 0) return;
    cargarOrganizacionesParaUsuario(seleccionado.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado?.id]);

  /* ---------------- FILTER ---------------- */

  const filtrados = useMemo(() => {
    const search = busqueda.toLowerCase().trim();

    return colaboradores.filter((c) => {
      const matchesSearch =
        !search ||
        c.nombre.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search);

      const matchesEstado = filtroEstado === "Todos" || c.estadoCuenta === filtroEstado;
      const matchesMental = filtroMental === "Todos" || c.mentalState === filtroMental;

      return matchesSearch && matchesEstado && matchesMental;
    });
  }, [colaboradores, busqueda, filtroEstado, filtroMental]);

  /* ---------------- CRUD: ROLE + EDIT + DEACTIVATE ---------------- */

  function abrirEditar() {
    if (!seleccionado) return;
    setError(null);

    setEditNombre(seleccionado.nombre);
    setEditEmail(seleccionado.email);

    // UI -> DB role
    setEditRol(seleccionado.esAdmin ? "ADMIN" : "COLABORADOR");

    setOpenEditar(true);
  }

  async function guardarEdicion() {
    if (!seleccionado) return;
    if (seleccionado.esAdminPrimario) {
      setError("No se puede editar el Admin Primario.");
      return;
    }

    const nombre = editNombre.trim();
    const correo = editEmail.trim().toLowerCase();

    if (!nombre || !correo) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const body =
        editRol === "ADMIN"
          ? {
              nombre,
              correo,
              rol: "ADMIN",
              admin_nivel: "SECUNDARIO", // regla dura
              estado: seleccionado.estadoCuenta === "Activo" ? "ACTIVO" : "SUSPENDIDO",
            }
          : {
              nombre,
              correo,
              rol: "COLABORADOR",
              admin_nivel: null,
              estado: seleccionado.estadoCuenta === "Activo" ? "ACTIVO" : "SUSPENDIDO",
            };

      const res = await fetch(`/api/admin/usuarios/${seleccionado.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? "No se pudo guardar.");
        return;
      }

      setOpenEditar(false);
      await cargarUsuarios();

      // refresca orgs del seleccionado (por si cambió)
      await cargarOrganizacionesParaUsuario(seleccionado.id);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function desactivarUsuario() {
    if (!seleccionado) return;
    if (seleccionado.esAdminPrimario) {
      setError("No se puede desactivar el Admin Primario.");
      return;
    }

    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${seleccionado.id}/desactivar`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "No se pudo desactivar.");
        return;
      }

      await cargarUsuarios();
    } catch {
      setError("No se pudo desactivar.");
    }
  }

  // (Opcional) crear usuario: ajusta URL/body a tu endpoint real
  async function crearUsuario() {
    const nombre = nuevoNombre.trim();
    const correo = nuevoEmail.trim().toLowerCase();
    if (!nombre || !correo) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const body =
        nuevoRol === "ADMIN"
          ? { nombre, correo, rol: "ADMIN", admin_nivel: "SECUNDARIO" }
          : { nombre, correo, rol: "COLABORADOR", admin_nivel: null };

      // ⚠️ Ajusta esta ruta si tu proyecto crea por otro endpoint
      const res = await fetch("/api/admin/usuarios/nuevo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "No se pudo crear.");
        return;
      }

      setOpenNuevo(false);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoRol("COLABORADOR");

      await cargarUsuarios();
    } catch {
      setError("No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  }

  /* ===================== UI ===================== */

  return (
    <div
      className="flex flex-col gap-4"
      style={{ color: palette.light, background: "transparent" }}
    >
      {/* HEADER BAR */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-[#fffef9]">Colaboradores</h1>
          <p className="text-xs text-[#fffef9]/70">
            Gestiona cuentas, carga de trabajo y bienestar del equipo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md px-3 py-2 text-sm font-medium border border-[#4a4748] bg-[#3d3b3c] hover:bg-[#4a4748]"
            onClick={cargarUsuarios}
          >
            Recargar
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-[#ee2346] text-[#fffef9] hover:bg-[#d8203f]"
            onClick={() => {
              setError(null);
              setOpenNuevo(true);
            }}
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {cargando && <p className="text-sm text-[#fffef9]/70">Cargando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* FILTERS */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-[#fffef9]/40" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar colaborador por nombre o email..."
            className="w-full rounded-md bg-[#3d3b3c] border border-[#4a4748] text-[#fffef9] pl-8 py-2 text-sm focus:ring-2 focus:ring-[#ee2346]/70 outline-none"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
          className="w-full rounded-md bg-[#3d3b3c] border border-[#4a4748] text-[#fffef9] px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2346]/70 outline-none"
        >
          <option value="Todos">Todos los estados de cuenta</option>
          <option value="Activo">Activo</option>
          <option value="Suspendido">Suspendido</option>
        </select>

        <select
          value={filtroMental}
          onChange={(e) => setFiltroMental(e.target.value as FiltroMental)}
          className="w-full rounded-md bg-[#3d3b3c] border border-[#4a4748] text-[#fffef9] px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2346]/70 outline-none"
        >
          <option value="Todos">Todos los estados mentales</option>
          <option value="Estable">Estable</option>
          <option value="Atento">Atento</option>
          <option value="En riesgo">En riesgo</option>
        </select>
      </div>

      {/* GRID: LISTA IZQ + DETALLE DER */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
        {/* LISTA IZQUIERDA */}
        <div className="rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-[#fffef9]/60 flex items-center gap-1">
              <User size={12} /> Usuarios ({filtrados.length})
            </span>
          </div>

          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`w-full text-left rounded-lg p-3 flex items-center justify-between transition-all ${
                seleccionado?.id === c.id
                  ? "bg-[#4a4748] border border-[#ee2346]/40"
                  : "bg-[#3d3b3c] border border-[#4a4748] hover:bg-[#4a4748]"
              }`}
              onClick={() => setSeleccionado(c)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#fffef9]">{c.nombre}</span>

                  {c.esAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50">
                      Admin
                    </span>
                  )}

                  {c.esAdminPrimario && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ee2346]/10 text-[#ee2346] border border-[#ee2346]/30">
                      Primario
                    </span>
                  )}
                </div>

                <span className="text-xs text-[#fffef9]/70">{c.rol}</span>

                <div className="mt-1 flex flex-wrap gap-1 items-center text-[10px] text-[#fffef9]/60">
                  <span>{c.email}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${getMentalClasses(c.mentalState)}`}>
                  {c.mentalState}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${getEstadoBadgeClasses(c.estadoCuenta)}`}>
                  {c.estadoCuenta}
                </span>
              </div>
            </button>
          ))}

          {!cargando && filtrados.length === 0 && (
            <p className="text-sm text-[#fffef9]/60 text-center py-4">
              No hay colaboradores que coincidan con los filtros.
            </p>
          )}
        </div>

        {/* PANEL DETALLE DERECHA */}
        {seleccionado && (
          <div className="rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-4 shadow-sm space-y-4">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#fffef9] flex items-center gap-2">
                  {seleccionado.nombre}

                  {seleccionado.esAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50">
                      Admin
                    </span>
                  )}

                  {seleccionado.esAdminPrimario && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ee2346]/10 text-[#ee2346] border border-[#ee2346]/30">
                      Primario
                    </span>
                  )}
                </h2>

                <p className="text-xs text-[#fffef9]/70 mb-1">{seleccionado.rol}</p>

                <p className="text-xs text-[#fffef9]/60">
                  Última revisión de bienestar:{" "}
                  <span className="font-medium text-[#fffef9]/80">{seleccionado.ultimaRevision}</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${getMentalClasses(seleccionado.mentalState)}`}>
                  <Heart size={11} className="inline mr-1" />
                  {seleccionado.mentalState}
                </span>

                <span className={`text-[11px] px-2 py-0.5 rounded-full ${getEstadoBadgeClasses(seleccionado.estadoCuenta)}`}>
                  {seleccionado.estadoCuenta}
                </span>
              </div>
            </div>

            {/* CONTEXTO BÁSICO */}
            <div className="grid gap-3 md:grid-cols-2 text-xs text-[#fffef9]/80">
              <div>
                <p>
                  <span className="font-semibold">Email:</span> {seleccionado.email}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1">Clientes asignados:</p>
                <p className="text-[11px] text-[#fffef9]/70">
                  {seleccionado.clientesAsignados?.length
                    ? seleccionado.clientesAsignados.join(" • ")
                    : "—"}
                </p>
              </div>
            </div>

            {/* STATS PRINCIPALES */}
            <div className="grid gap-3 md:grid-cols-4 text-xs">
              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60 flex items-center gap-1">
                  <List size={11} /> Tareas totales
                </span>
                <span className="text-lg font-semibold text-[#fffef9]">{seleccionado.totalTareas}</span>
              </div>

              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60">Pendientes</span>
                <span className="text-lg font-semibold text-[#facc15]">{seleccionado.tareasPendientes}</span>
              </div>

              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60 flex items-center gap-1">
                  <CheckCircle size={11} /> Aprobadas
                </span>
                <span className="text-lg font-semibold text-[#6cbe45]">{seleccionado.tareasAprobadas}</span>
                <span className="text-[10px] text-[#fffef9]/60">
                  {seleccionado.porcentajeAprobacion}% tasa de aprobación
                </span>
              </div>

              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60 flex items-center gap-1">
                  <Activity size={11} /> Chilli Points
                </span>
                <span className="text-lg font-semibold text-[#ee2346]">{seleccionado.chilliPoints}</span>
                <span className="text-[10px] text-[#fffef9]/60">+{seleccionado.chilliPointsMes} este mes</span>
              </div>
            </div>

            {/* NOTAS / BIENESTAR */}
            {seleccionado.notas && (
              <div className="mt-2 rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 text-xs text-[#fffef9]/80">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={12} className="text-[#ee2346]" />
                  <span className="font-semibold text-[11px] uppercase tracking-wide">
                    Notas de bienestar / gestión
                  </span>
                </div>
                <p>{seleccionado.notas}</p>
              </div>
            )}

            {/* ACCIONES */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748] mt-2">
              <button
                className="rounded-md bg-transparent border border-[#ee2346] text-[#ee2346] text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1 disabled:opacity-50"
                onClick={abrirEditar}
                disabled={seleccionado.esAdminPrimario}
                title={seleccionado.esAdminPrimario ? "No se puede editar Admin Primario" : "Editar"}
              >
                <Edit2 size={12} /> Editar
              </button>

              <button
                className="rounded-md bg-transparent border border-[#ee2346]/50 text-[#ee2346]/80 text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1 disabled:opacity-50"
                onClick={desactivarUsuario}
                disabled={seleccionado.esAdminPrimario}
                title={seleccionado.esAdminPrimario ? "No se puede desactivar Admin Primario" : "Desactivar"}
              >
                <Trash2 size={12} /> Eliminar / desactivar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EDITAR */}
      {openEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg">
            <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
              <h3 className="text-white font-semibold">Editar usuario</h3>
              <button
                type="button"
                onClick={() => {
                  setOpenEditar(false);
                  setError(null);
                }}
                className="text-xs text-gray-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Nombre</label>
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Email</label>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Rol</label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as any)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                >
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="ADMIN">Admin secundario</option>
                </select>

                <p className="text-[11px] text-gray-400 mt-2">
                  Nota: si eliges <span className="text-gray-200">Admin</span>, se guardará como{" "}
                  <span className="text-gray-200">SECUNDARIO</span> automáticamente.
                </p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748]/30">
                <button
                  type="button"
                  onClick={() => setOpenEditar(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-[#3a3738] transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  onClick={guardarEdicion}
                  className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO */}
      {openNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg">
            <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
              <h3 className="text-white font-semibold">Nuevo usuario</h3>
              <button
                type="button"
                onClick={() => {
                  setOpenNuevo(false);
                  setError(null);
                }}
                className="text-xs text-gray-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Nombre</label>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Email</label>
                <input
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Rol</label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as any)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]"
                >
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="ADMIN">Admin secundario</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748]/30">
                <button
                  type="button"
                  onClick={() => setOpenNuevo(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-[#3a3738] transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  onClick={crearUsuario}
                  className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                >
                  {guardando ? "Creando..." : "Crear"}
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                Si el endpoint de creación en tu proyecto no es <span className="text-gray-200">/api/admin/usuarios/nuevo</span>,
                dime cuál estás usando (vi que tienes <span className="text-gray-200">/api/admin/crear-usuario</span>) y lo adapto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
