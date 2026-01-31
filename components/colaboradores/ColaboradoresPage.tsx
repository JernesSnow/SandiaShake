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
type EstadoCuenta = "Activo" | "Suspendido";

type RolColaborador =
  | "Admin"
  | "Ejecutivo de cuenta"
  | "Diseñador"
  | "Editor"
  | "Community Manager";

type UsuarioDB = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: "ADMIN" | "COLABORADOR";
  admin_nivel: "PRIMARIO" | "SECUNDARIO" | null;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
  created_at: string;
};

type Colaborador = {
  id: string;
  id_usuario: number;
  nombre: string;
  email: string;
  rol: RolColaborador;
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
  tareasRecientes: any[];
  notas?: string;
};

type FiltroEstado = "Todos" | EstadoCuenta;
type FiltroMental = "Todos" | MentalState;

/* ===================== HELPERS ===================== */

function mapRolUIFromDB(rol: "ADMIN" | "COLABORADOR"): RolColaborador {
  return rol === "ADMIN" ? "Admin" : "Ejecutivo de cuenta";
}

function mapEstadoCuentaFromDB(
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO"
): EstadoCuenta {
  return estado === "ACTIVO" ? "Activo" : "Suspendido";
}

function getEstadoBadgeClasses(estado: EstadoCuenta) {
  return estado === "Activo"
    ? "bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/50"
    : "bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50";
}

function getMentalClasses(mental: MentalState) {
  if (mental === "Estable")
    return "bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/50";
  if (mental === "Atento")
    return "bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/50";
  return "bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50";
}

/* ===================== COMPONENT ===================== */

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos");
  const [filtroMental, setFiltroMental] = useState<FiltroMental>("Todos");

  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgSeleccionada, setOrgSeleccionada] = useState<number | "">("");

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");

  const [editNombre, setEditNombre] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [editEstado, setEditEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  /* ===================== LOADERS ===================== */

  async function cargarColaboradores() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/colaboradores");
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Error cargando colaboradores");

      const mapped: Colaborador[] = json.colaboradores.map((u: UsuarioDB) => ({
        id: String(u.id_usuario),
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        email: u.correo,
        rol: mapRolUIFromDB(u.rol),
        esAdmin: u.rol === "ADMIN",
        esAdminPrimario: u.admin_nivel === "PRIMARIO",
        estadoCuenta: mapEstadoCuentaFromDB(u.estado),
        mentalState: "Estable",
        ultimaRevision: u.created_at.slice(0, 10),
        clientesAsignados: [],
        totalTareas: 0,
        tareasPendientes: 0,
        tareasAprobadas: 0,
        porcentajeAprobacion: 0,
        chilliPoints: 0,
        chilliPointsMes: 0,
        tareasRecientes: [],
      }));

      setColaboradores(mapped);
      setSeleccionado(mapped[0] ?? null);
    } catch (e: any) {
      setError(e.message);
      setColaboradores([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarColaboradores();
  }, []);

  /* ===================== FILTER ===================== */

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return colaboradores.filter((c) => {
      const okSearch =
        !q || c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      const okEstado = filtroEstado === "Todos" || c.estadoCuenta === filtroEstado;
      const okMental = filtroMental === "Todos" || c.mentalState === filtroMental;
      return okSearch && okEstado && okMental;
    });
  }, [colaboradores, busqueda, filtroEstado, filtroMental]);

  /* ===================== ACTIONS ===================== */

  async function crearColaborador() {
    if (!nuevoNombre || !nuevoCorreo) {
      alert("Nombre y correo son obligatorios");
      return;
    }

    setCreando(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre,
          correo: nuevoCorreo,
          password: nuevoPass || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setModalNuevoOpen(false);
      setNuevoNombre("");
      setNuevoCorreo("");
      setNuevoPass("");
      await cargarColaboradores();

      if (json.temp_password) {
        alert(`Contraseña temporal: ${json.temp_password}`);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreando(false);
    }
  }

  async function guardarEdicion() {
    if (!seleccionado) return;

    setGuardandoEdit(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: seleccionado.id_usuario,
          nombre: editNombre,
          correo: editCorreo,
          estado: editEstado,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setModalEditarOpen(false);
      await cargarColaboradores();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function eliminarColaborador() {
    if (!seleccionado) return;
    if (!confirm(`¿Eliminar a ${seleccionado.nombre}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/colaboradores?id_usuario=${seleccionado.id_usuario}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await cargarColaboradores();
    } catch (e: any) {
      alert(e.message);
    }
  }

  /* ===================== UI ===================== */

  return (
    <div className="flex flex-col gap-4 text-[#fffef9]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Colaboradores</h1>
          <p className="text-xs opacity-70">
            Gestión de equipo y asignaciones
          </p>
        </div>
        <button
          onClick={() => setModalNuevoOpen(true)}
          className="flex items-center gap-2 bg-[#ee2346] px-3 py-2 rounded-md"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {cargando && <p>Cargando…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* LIST */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setSeleccionado(c)}
              className={`w-full text-left p-3 rounded-lg border ${
                seleccionado?.id === c.id
                  ? "border-[#ee2346]"
                  : "border-[#4a4748]"
              }`}
            >
              <div className="font-semibold">{c.nombre}</div>
              <div className="text-xs opacity-70">{c.email}</div>
            </button>
          ))}
        </div>

        {seleccionado && (
          <div className="border border-[#4a4748] rounded-lg p-4 space-y-3">
            <h2 className="text-lg font-semibold">{seleccionado.nombre}</h2>
            <p className="text-xs">{seleccionado.email}</p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditNombre(seleccionado.nombre);
                  setEditCorreo(seleccionado.email);
                  setEditEstado(
                    seleccionado.estadoCuenta === "Activo" ? "ACTIVO" : "INACTIVO"
                  );
                  setModalEditarOpen(true);
                }}
                className="border px-3 py-1 text-xs rounded"
              >
                <Edit2 size={12} /> Editar
              </button>

              <button
                onClick={eliminarColaborador}
                className="border px-3 py-1 text-xs rounded text-red-400"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS omitted for brevity — logic already wired */}
    </div>
  );
}
