"use client";

import { useMemo, useState } from "react";
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

type MentalState = "Estable" | "Atento" | "En riesgo";
type RolColaborador =
  | "Admin"
  | "Estratega"
  | "Ejecutivo de cuenta"
  | "Diseñador"
  | "Editor"
  | "Community Manager";
type EstadoCuenta = "Activo" | "Suspendido";

type TaskStatus = "Pendiente" | "En progreso" | "En revisión" | "Aprobada";
type TaskPrioridad = "Alta" | "Media" | "Baja";

export type ColaboradorTask = {
  id: string;
  titulo: string;
  cliente: string;
  status: TaskStatus;
  prioridad: TaskPrioridad;
  mes: string;
};

export type Colaborador = {
  id: string;
  nombre: string;
  rol: RolColaborador;
  email: string;
  telefono?: string;
  esAdmin: boolean;
  estadoCuenta: EstadoCuenta;
  mentalState: MentalState;
  ultimaRevision: string;
  clientesAsignados: string[];

  // Stats
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  porcentajeAprobacion: number; // 0-100
  chilliPoints: number;
  chilliPointsMes: number;

  tareasRecientes: ColaboradorTask[];

  notas?: string;
};

type FiltroEstado = "Todos" | EstadoCuenta;
type FiltroMental = "Todos" | MentalState;

const palette = {
  dark: "#333132",
  darkSoft: "#3d3b3c",
  darkLighter: "#4a4748",
  light: "#fffef9",
  alert: "#ee2346",
  success: "#6cbe45",
};

const initialColaboradores: Colaborador[] = [
  {
    id: "c1",
    nombre: "Ana Rodríguez",
    rol: "Ejecutivo de cuenta",
    email: "ana@sandiashake.com",
    telefono: "+506 8888-1111",
    esAdmin: false,
    estadoCuenta: "Activo",
    mentalState: "Estable",
    ultimaRevision: "2025-02-01",
    clientesAsignados: ["Café La Plaza", "Gimnasio PowerFit"],

    totalTareas: 34,
    tareasPendientes: 4,
    tareasAprobadas: 26,
    porcentajeAprobacion: 76,
    chilliPoints: 320,
    chilliPointsMes: 95,

    tareasRecientes: [
      {
        id: "t1",
        titulo: "Calendario de contenidos febrero",
        cliente: "Café La Plaza",
        status: "Aprobada",
        prioridad: "Alta",
        mes: "Febrero 2025",
      },
      {
        id: "t2",
        titulo: "Brief campaña membresías Q1",
        cliente: "Gimnasio PowerFit",
        status: "En progreso",
        prioridad: "Media",
        mes: "Febrero 2025",
      },
      {
        id: "t3",
        titulo: "Revisión pauta Meta enero",
        cliente: "Café La Plaza",
        status: "Pendiente",
        prioridad: "Baja",
        mes: "Enero 2025",
      },
    ],

    notas:
      "Le gusta recibir feedback estructurado; reuniones 1:1 mensuales funcionan bien.",
  },
  {
    id: "c2",
    nombre: "Carlos Méndez",
    rol: "Diseñador",
    email: "carlos@sandiashake.com",
    telefono: "+506 8888-2222",
    esAdmin: false,
    estadoCuenta: "Activo",
    mentalState: "Atento",
    ultimaRevision: "2025-01-25",
    clientesAsignados: ["Hotel Las Olas", "Panadería Dulce Vida"],

    totalTareas: 41,
    tareasPendientes: 7,
    tareasAprobadas: 28,
    porcentajeAprobacion: 68,
    chilliPoints: 280,
    chilliPointsMes: 80,

    tareasRecientes: [
      {
        id: "t4",
        titulo: "Pack de historias IG San Valentín",
        cliente: "Hotel Las Olas",
        status: "En revisión",
        prioridad: "Alta",
        mes: "Febrero 2025",
      },
      {
        id: "t5",
        titulo: "Arte para combo de desayunos",
        cliente: "Panadería Dulce Vida",
        status: "Aprobada",
        prioridad: "Media",
        mes: "Enero 2025",
      },
      {
        id: "t6",
        titulo: "Adaptaciones para stories",
        cliente: "Hotel Las Olas",
        status: "En progreso",
        prioridad: "Media",
        mes: "Enero 2025",
      },
    ],

    notas:
      "Reporta cansancio en cierres de mes; ideal programar descansos luego de entregas grandes.",
  },
  {
    id: "c3",
    nombre: "Jimena Torres",
    rol: "Admin",
    email: "jimena@sandiashake.com",
    telefono: "+506 8888-3333",
    esAdmin: true,
    estadoCuenta: "Activo",
    mentalState: "Estable",
    ultimaRevision: "2025-02-05",
    clientesAsignados: ["Sandía con Chile"],

    totalTareas: 18,
    tareasPendientes: 2,
    tareasAprobadas: 14,
    porcentajeAprobacion: 78,
    chilliPoints: 410,
    chilliPointsMes: 120,

    tareasRecientes: [
      {
        id: "t7",
        titulo: "Revisión pipeline CRM",
        cliente: "Sandía con Chile",
        status: "Aprobada",
        prioridad: "Alta",
        mes: "Febrero 2025",
      },
      {
        id: "t8",
        titulo: "Definición de SLA internos",
        cliente: "Sandía con Chile",
        status: "En progreso",
        prioridad: "Alta",
        mes: "Febrero 2025",
      },
      {
        id: "t9",
        titulo: "Actualización formatos de briefing",
        cliente: "Sandía con Chile",
        status: "Aprobada",
        prioridad: "Media",
        mes: "Enero 2025",
      },
    ],

    notas:
      "Admin general; monitoriza carga de clientes y balance del equipo. Ideal como punto de escalamiento.",
  },
  {
    id: "c4",
    nombre: "Luis Navarro",
    rol: "Community Manager",
    email: "luis@sandiashake.com",
    telefono: "+506 8888-4444",
    esAdmin: false,
    estadoCuenta: "Suspendido",
    mentalState: "En riesgo",
    ultimaRevision: "2025-01-10",
    clientesAsignados: ["Marca Confidencial"],

    totalTareas: 22,
    tareasPendientes: 6,
    tareasAprobadas: 10,
    porcentajeAprobacion: 45,
    chilliPoints: 150,
    chilliPointsMes: 20,

    tareasRecientes: [
      {
        id: "t10",
        titulo: "Monitoreo de comentarios Q4",
        cliente: "Marca Confidencial",
        status: "Pendiente",
        prioridad: "Alta",
        mes: "Enero 2025",
      },
      {
        id: "t11",
        titulo: "Reporte mensual de interacción",
        cliente: "Marca Confidencial",
        status: "Aprobada",
        prioridad: "Media",
        mes: "Diciembre 2024",
      },
      {
        id: "t12",
        titulo: "Documentar respuestas frecuentes",
        cliente: "Marca Confidencial",
        status: "En revisión",
        prioridad: "Media",
        mes: "Diciembre 2024",
      },
    ],

    notas:
      "Caso en seguimiento con RRHH; importante priorizar tareas esenciales y reducir presión en picos.",
  },
];

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

function getStatusPill(status: TaskStatus) {
  switch (status) {
    case "Pendiente":
      return "bg-[#4b5563]/40 text-[#e5e7eb] border border-[#6b7280]";
    case "En progreso":
      return "bg-[#0ea5e9]/20 text-[#7dd3fc] border border-[#0ea5e9]/60";
    case "En revisión":
      return "bg-[#f97316]/20 text-[#fed7aa] border border-[#f97316]/60";
    case "Aprobada":
      return "bg-[#6cbe45]/20 text-[#bbf7d0] border border-[#6cbe45]/60";
  }
}

function getPrioridadDot(prioridad: TaskPrioridad) {
  if (prioridad === "Alta") return "bg-[#ee2346]";
  if (prioridad === "Media") return "bg-[#facc15]";
  return "bg-[#9ca3af]";
}

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] =
    useState<Colaborador[]>(initialColaboradores);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todos");
  const [filtroMental, setFiltroMental] = useState<FiltroMental>("Todos");
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(
    initialColaboradores[0]
  );

  const filtrados = useMemo(() => {
    const search = busqueda.toLowerCase();
    return colaboradores.filter((c) => {
      const matchesSearch =
        !search ||
        c.nombre.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search);
      const matchesEstado =
        filtroEstado === "Todos" || c.estadoCuenta === filtroEstado;
      const matchesMental =
        filtroMental === "Todos" || c.mentalState === filtroMental;
      return matchesSearch && matchesEstado && matchesMental;
    });
  }, [colaboradores, busqueda, filtroEstado, filtroMental]);

  return (
    <div
      className="flex flex-col gap-4"
      style={{ color: palette.light, background: "transparent" }}
    >
      {/* HEADER BAR */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-[#fffef9]">
            Colaboradores
          </h1>
          <p className="text-xs text-[#fffef9]/70">
            Gestiona cuentas, carga de trabajo y bienestar del equipo.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-[#ee2346] text-[#fffef9] hover:bg-[#d8203f]"
          onClick={() => {
            // futuro: abrir modal de nuevo colaborador
            alert("Crear nuevo colaborador (pendiente de implementar)");
          }}
        >
          <Plus size={16} /> Nuevo colaborador
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-2 text-[#fffef9]/40"
          />
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
              <User size={12} /> Colaboradores ({filtrados.length})
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
                  <span className="text-sm font-semibold text-[#fffef9]">
                    {c.nombre}
                  </span>
                  {c.esAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ee2346] border border-[#ee2346]/50">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#fffef9]/70">{c.rol}</span>
                <div className="mt-1 flex flex-wrap gap-1 items-center text-[10px] text-[#fffef9]/60">
                  <span>{c.email}</span>
                  {c.telefono && (
                    <>
                      <span className="mx-1 text-[#fffef9]/30">•</span>
                      <span>{c.telefono}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${getMentalClasses(
                    c.mentalState
                  )}`}
                >
                  {c.mentalState}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${getEstadoBadgeClasses(
                    c.estadoCuenta
                  )}`}
                >
                  {c.estadoCuenta}
                </span>
              </div>
            </button>
          ))}

          {filtrados.length === 0 && (
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
                </h2>
                <p className="text-xs text-[#fffef9]/70 mb-1">
                  {seleccionado.rol}
                </p>
                <p className="text-xs text-[#fffef9]/60">
                  Última revisión de bienestar:{" "}
                  <span className="font-medium text-[#fffef9]/80">
                    {seleccionado.ultimaRevision}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${getMentalClasses(
                    seleccionado.mentalState
                  )}`}
                >
                  <Heart size={11} className="inline mr-1" />
                  {seleccionado.mentalState}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${getEstadoBadgeClasses(
                    seleccionado.estadoCuenta
                  )}`}
                >
                  {seleccionado.estadoCuenta}
                </span>
              </div>
            </div>

            {/* CONTEXTO BÁSICO */}
            <div className="grid gap-3 md:grid-cols-2 text-xs text-[#fffef9]/80">
              <div>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  {seleccionado.email}
                </p>
                {seleccionado.telefono && (
                  <p>
                    <span className="font-semibold">Teléfono:</span>{" "}
                    {seleccionado.telefono}
                  </p>
                )}
              </div>
              <div>
                <p className="font-semibold mb-1">Clientes asignados:</p>
                <p className="text-[11px] text-[#fffef9]/70">
                  {seleccionado.clientesAsignados.join(" • ")}
                </p>
              </div>
            </div>

            {/* STATS PRINCIPALES */}
            <div className="grid gap-3 md:grid-cols-4 text-xs">
              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60 flex items-center gap-1">
                  <List size={11} /> Tareas totales
                </span>
                <span className="text-lg font-semibold text-[#fffef9]">
                  {seleccionado.totalTareas}
                </span>
              </div>

              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60">Pendientes</span>
                <span className="text-lg font-semibold text-[#facc15]">
                  {seleccionado.tareasPendientes}
                </span>
              </div>

              <div className="rounded-lg bg-[#4a4748] border border-[#6b7280] p-3 flex flex-col gap-1">
                <span className="text-[10px] text-[#fffef9]/60 flex items-center gap-1">
                  <CheckCircle size={11} /> Aprobadas
                </span>
                <span className="text-lg font-semibold text-[#6cbe45]">
                  {seleccionado.tareasAprobadas}
                </span>
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

            {/* TAREAS RECIENTES */}
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
                className="rounded-md bg-transparent border border-[#ee2346] text-[#ee2346] text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1"
                onClick={() =>
                  alert("Editar colaborador (pendiente de implementar)")
                }
              >
                <Edit2 size={12} />
                Editar
              </button>
              <button
                className="rounded-md bg-transparent border border-[#ee2346]/50 text-[#ee2346]/80 text-xs px-3 py-1.5 hover:bg-[#ee2346]/10 inline-flex items-center gap-1"
                onClick={() =>
                  alert("Eliminar / desactivar colaborador (confirmación pendiente)")
                }
              >
                <Trash2 size={12} />
                Eliminar / desactivar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
