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
  id: string;
  id_usuario?: number;
  nombre: string;
  rol: RolColaborador; 
  email: string;
  telefono?: string;
  id: number;
  nombre: string;
  rol: RolColaborador;
  email: string;
  esAdmin: boolean;
  esAdminPrimario: boolean;
  estadoCuenta: EstadoCuenta;
  mentalState: MentalState;
  ultimaRevision: string;
  clientesAsignados: string[];
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  porcentajeAprobacion: number;
  chilliPoints: number;
  chilliPointsMes: number;
  tareasRecientes: ColaboradorTask[];
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
    rol: esAdmin ? "Admin" : "Ejecutivo de cuenta",
    esAdmin,
    esAdminPrimario,
    estadoCuenta: u.estado === "ACTIVO" ? "Activo" : "Suspendido",
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


export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos");
  const [filtroMental, setFiltroMental] = useState<FiltroMental>("Todos");

  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(null);

  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgSeleccionada, setOrgSeleccionada] = useState<number | "">("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");
  const [creando, setCreando] = useState(false);

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [editEstado, setEditEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  async function cargarColaboradores() {
    try {
      const res = await fetch("/api/admin/colaboradores");
      const json = await res.json();
      console.log("colaboradores status:", res.status, json);

      if (!res.ok) {
        setColaboradores([]);
        setSeleccionado(null);
        return;
      }

      const raw = (json.colaboradores ?? []) as any[];

      const mapped: Colaborador[] = raw.map((u: any) => ({
        id: String(u.id_usuario),
        id_usuario: u.id_usuario,

        nombre: u.nombre ?? "",
        rol: mapRolUIFromDB(u.rol),
        email: u.correo ?? "",
        telefono: u.telefono ?? undefined,

        esAdmin: false,
        estadoCuenta: mapEstadoCuentaFromDB(u.estado),
        mentalState: "Estable",
        ultimaRevision: String(u.created_at ?? "").slice(0, 10) || "—",
        clientesAsignados: [],

        totalTareas: 0,
        tareasPendientes: 0,
        tareasAprobadas: 0,
        porcentajeAprobacion: 0,
        chilliPoints: 0,
        chilliPointsMes: 0,
        tareasRecientes: [],
        notas: "",
      }));

      setColaboradores(mapped);
      setSeleccionado((prev) => {
        if (prev?.id_usuario) {
          const still = mapped.find((m) => m.id_usuario === prev.id_usuario);
          return still ?? mapped[0] ?? null;
        }
        return mapped[0] ?? null;
      });
    } catch (e) {
      console.error(e);
      setColaboradores([]);
      setSeleccionado(null);
    }
  }

  useEffect(() => {
    cargarColaboradores();
  }, []);

  useEffect(() => {
    if (seleccionado?.id_usuario) {
      cargarAsignaciones(seleccionado.id_usuario);
    } else {
      setAsignaciones([]);
    }
  }, [seleccionado]);

  async function cargarAsignaciones(idColaborador: number) {
    try {
      const res = await fetch(
        `/api/admin/asignaciones?id_colaborador=${idColaborador}`
      );
      const json = await res.json();

      console.log("asignaciones status:", res.status, json);

      if (!res.ok) {
        setAsignaciones([]);
        return;
      }

      setAsignaciones(json.data ?? []);
    } catch (e) {
      console.error(e);
      setAsignaciones([]);
    }
  }

  async function cargarOrganizaciones() {
    setLoadingOrgs(true);
    try {
      const res = await fetch(`/api/admin/organizaciones`);
      const json = await res.json();

      console.log("orgs status:", res.status, json);

      if (!res.ok) {
        setOrgs([]);
        return;
      }

      setOrgs(json.data ?? []);
    } catch (e) {
      console.error(e);
      setOrgs([]);
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function asignarCliente() {
    if (!seleccionado?.id_usuario) {
      alert("Debe seleccionar un colaborador");
      return;
    }
    if (!orgSeleccionada) {
      alert("Debe seleccionar una organización");
      return;
    }

    const res = await fetch(`/api/admin/asignaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_colaborador: seleccionado.id_usuario,
        id_organizacion: orgSeleccionada,
      }),
    });

    const json = await res.json();
    console.log("asignar status:", res.status, json);

    if (!res.ok) {
      alert(json.error || "Ocurrió un error al asignar");
      return;
    }

    await cargarAsignaciones(seleccionado.id_usuario);

    setModalAsignarOpen(false);
    setOrgSeleccionada("");
  }

  async function crearColaborador() {
    if (!nuevoNombre.trim() || !nuevoCorreo.trim()) {
      alert("Nombre y correo son obligatorios");
      return;
    }

    setCreando(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          correo: nuevoCorreo.trim(),
          password: nuevoPass.trim() || undefined,
        }),
      });

      const json = await res.json();
      console.log("crear colaborador:", res.status, json);

      if (!res.ok) {
        alert(json.error || "No se pudo crear el colaborador");
        return;
      }

      await cargarColaboradores();

      setModalNuevoOpen(false);
      setNuevoNombre("");
      setNuevoCorreo("");
      setNuevoPass("");

      if (json?.temp_password) {
        alert(`Colaborador creado.\Contraseña temporal: ${json.temp_password}`);
      } else {
        alert("Colaborador creado.");
      }
    } catch (e) {
      console.error(e);
      alert("Error creando colaborador");
    } finally {
      setCreando(false);
    }
  }

  function openEditar() {
    if (!seleccionado?.id_usuario) return;
    setEditNombre(seleccionado.nombre ?? "");
    setEditCorreo(seleccionado.email ?? "");
    setEditEstado(seleccionado.estadoCuenta === "Activo" ? "ACTIVO" : "INACTIVO");
    setModalEditarOpen(true);
  }

  async function guardarEdicion() {
    if (!seleccionado?.id_usuario) return;

    const nombre = editNombre.trim();
    const correo = editCorreo.trim();
    if (!nombre || !correo) {
      alert("Nombre y correo son obligatorios");
      return;
    }

    setGuardandoEdit(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: seleccionado.id_usuario,
          nombre,
          correo,
          estado: editEstado,
        }),
      });

      const json = await res.json();
      console.log("editar colaborador:", res.status, json);

      if (!res.ok) {
        alert(json?.error || "No se pudo actualizar");
        return;
      }

      setModalEditarOpen(false);

      await cargarColaboradores();
    } catch (e) {
      console.error(e);
      alert("Error actualizando colaborador");
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function eliminarColaborador() {
    if (!seleccionado?.id_usuario) return;

    const ok = confirm(
      `¿Desea eliminar a "${seleccionado.nombre}"?`
    );
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/admin/colaboradores?id_usuario=${seleccionado.id_usuario}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      console.log("eliminar colaborador:", res.status, json);

      if (!res.ok) {
        alert(json?.error || "No se pudo eliminar");
        return;
      }

      await cargarColaboradores();
    } catch (e) {
      console.error(e);
      alert("Error eliminando colaborador");
    }
  }

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


  function abrirEditar() {
    if (!seleccionado) return;
    setError(null);
    setEditNombre(seleccionado.nombre);
    setEditEmail(seleccionado.email);
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
              admin_nivel: "SECUNDARIO", 
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
        <button
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-[#ee2346] text-[#fffef9] hover:bg-[#d8203f]"
          onClick={() => setModalNuevoOpen(true)}
        >
          <Plus size={16} /> Nuevo colaborador
        </button>
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

      {/* GRID */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
        {/* LISTA DE COLABORADORES */}
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

        {/* INFO DEL COLABORADOR */}
        {seleccionado && (
          <div className="rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-4 shadow-sm space-y-4">
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

            <div className="grid gap-3 md:grid-cols-2 text-xs text-[#fffef9]/80">
              <div>
                <p>
                  <span className="font-semibold">Email:</span> {seleccionado.email}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 flex items-center justify-between">
                  Organizaciones asignadas:
                  <button
                    className="text-[11px] px-2 py-1 rounded-md border border-[#ee2346]/50 text-[#ee2346]/90 hover:bg-[#ee2346]/10"
                    onClick={async () => {
                      setModalAsignarOpen(true);
                      await cargarOrganizaciones();
                    }}
                  >
                    Asignar a organizacion
                  </button>
                </p>

                {asignaciones.length === 0 ? (
                  <p className="text-[11px] text-[#fffef9]/60">
                    Sin organizaciones asignadas.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#fffef9]/70">
                    {asignaciones
                      .map((a) => a.nombre)
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>
            </div>

            {/* STATS */}
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
                <span className="text-lg font-semibold text-[#ee2346]">
                  {seleccionado.chilliPoints}
                </span>
                <span className="text-[10px] text-[#fffef9]/60">
                  +{seleccionado.chilliPointsMes} este mes
                </span>
              </div>
            </div>

            {/* TAREAS */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-[#fffef9]/60 flex items-center gap-1">
                  <List size={12} /> Tareas recientes
                </span>
              </div>

              <div className="space-y-2">
                {seleccionado.tareasRecientes.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-2.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#fffef9] text-[12px]">
                        {t.titulo}
                      </p>
                      <p className="text-[11px] text-[#fffef9]/70">
                        Cliente: <span className="font-medium">{t.cliente}</span>
                      </p>
                      <p className="text-[11px] text-[#fffef9]/60">
                        Mes: {t.mes}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] border ${getStatusPill(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#fffef9]/70">
                        <span
                          className={`w-2 h-2 rounded-full ${getPrioridadDot(
                            t.prioridad
                          )}`}
                        />
                        {t.prioridad}
                      </span>
                    </div>
                  </div>
                ))}

                {seleccionado.tareasRecientes.length === 0 && (
                  <p className="text-[11px] text-[#fffef9]/60">
                    Sin tareas recientes.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748] mt-2">
              <button
                className="rounded-md bg-transparent border border-[#ee2346] text-[#ee2346] text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1"
                onClick={openEditar}
              >
                <Edit2 size={12} /> Editar
              </button>

              <button
                className="rounded-md bg-transparent border border-[#ee2346]/50 text-[#ee2346]/80 text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1"
                onClick={eliminarColaborador}
              >
                <Trash2 size={12} /> Eliminar / desactivar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDITAR */}
      {modalEditarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#fffef9]">
                Editar colaborador
              </h3>
              <button
                className="text-[#fffef9]/70 hover:text-[#fffef9]"
                onClick={() => setModalEditarOpen(false)}
              >
                ✕
              </button>
            </div>

            <label className="text-xs text-[#fffef9]/70">Nombre</label>
            <input
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
              placeholder="Nombre"
            />

            <label className="text-xs text-[#fffef9]/70 mt-3 block">
              Correo
            </label>
            <input
              value={editCorreo}
              onChange={(e) => setEditCorreo(e.target.value)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
              placeholder="correo@dominio.com"
            />

            <label className="text-xs text-[#fffef9]/70 mt-3 block">
              Estado de cuenta
            </label>
            <select
              value={editEstado}
              onChange={(e) => setEditEstado(e.target.value as any)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Suspendido</option>
            </select>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-md bg-transparent border border-[#6b7280] text-[#fffef9]/80 text-xs px-3 py-2 hover:bg-[#4a4748]"
                onClick={() => setModalEditarOpen(false)}
              >
                Cancelar
              </button>

              <button
                className="rounded-md bg-[#ee2346] text-[#fffef9] text-xs px-3 py-2 hover:bg-[#d8203f] disabled:opacity-60"
                disabled={guardandoEdit}
                onClick={guardarEdicion}
              >
                {guardandoEdit ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASIGNAR */}
      {modalAsignarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#fffef9]">
                Asignar a cliente
              </h3>
              <button
                className="text-[#fffef9]/70 hover:text-[#fffef9]"
                onClick={() => {
                  setModalAsignarOpen(false);
                  setOrgSeleccionada("");
                }}
              >
                ✕
              </button>
            </div>

            <label className="text-xs text-[#fffef9]/70">Cliente</label>
            <select
              value={orgSeleccionada}
              onChange={(e) =>
                setOrgSeleccionada(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
            >
              <option value="">Seleccionar...</option>
              {orgs.map((o) => (
                <option key={o.id_organizacion} value={o.id_organizacion}>
                  {o.nombre}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-md bg-transparent border border-[#6b7280] text-[#fffef9]/80 text-xs px-3 py-2 hover:bg-[#4a4748]"
                onClick={() => {
                  setModalAsignarOpen(false);
                  setOrgSeleccionada("");
                }}
              >
                Cancelar
              </button>

              <button
                className="rounded-md bg-[#ee2346] text-[#fffef9] text-xs px-3 py-2 hover:bg-[#d8203f] disabled:opacity-60"
                disabled={loadingOrgs}
                onClick={asignarCliente}
              >
                {loadingOrgs ? "Cargando..." : "Asignar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGREGAR UN COLABORADOR */}
      {modalNuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-[#3d3b3c] border border-[#4a4748] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#fffef9]">
                Nuevo colaborador
              </h3>
              <button
                className="text-[#fffef9]/70 hover:text-[#fffef9]"
                onClick={() => setModalNuevoOpen(false)}
              >
                ✕
              </button>
            </div>

            <label className="text-xs text-[#fffef9]/70">Nombre</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
              placeholder="Ej: Ana Rodríguez"
            />

            <label className="text-xs text-[#fffef9]/70 mt-3 block">
              Correo
            </label>
            <input
              value={nuevoCorreo}
              onChange={(e) => setNuevoCorreo(e.target.value)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
              placeholder="correo@dominio.com"
            />

            <label className="text-xs text-[#fffef9]/70 mt-3 block">
              Password (opcional)
            </label>
            <input
              value={nuevoPass}
              onChange={(e) => setNuevoPass(e.target.value)}
              className="w-full mt-1 rounded-md bg-[#4a4748] border border-[#6b7280] text-[#fffef9] px-3 py-2 text-sm outline-none"
              placeholder="Si lo dejas vacío se genera uno temporal"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-md bg-transparent border border-[#6b7280] text-[#fffef9]/80 text-xs px-3 py-2 hover:bg-[#4a4748]"
                onClick={() => setModalNuevoOpen(false)}
              >
                Cancelar
              </button>

              <button
                className="rounded-md bg-[#ee2346] text-[#fffef9] text-xs px-3 py-2 hover:bg-[#d8203f] disabled:opacity-60"
                disabled={creando}
                onClick={crearColaborador}
              >
                {creando ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
