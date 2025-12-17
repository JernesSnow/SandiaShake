// components/clientes/ClientesGraphView.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Briefcase,
  Search,
  X,
  Plus,
  Check,
  Users,
} from "react-feather";

/* ---------- TYPES ---------- */

type Client = {
  id: string;
  nombre: string;
  email: string;
  plan: string;
  estado: "Activo" | "Moroso" | "Inactivo";
  colaboradores: string[]; // nombres
};

type Colaborador = {
  id: string;
  nombre: string;
  rol: string;
};

type Connection = {
  clientId: string;
  colaboradorNombre: string;
  clientIndex: number;
  colaboradorIndex: number;
};

/* ---------- SAMPLE DATA (STATE) ---------- */

const sampleClients: Client[] = [
  {
    id: "1",
    nombre: "Café La Plaza",
    email: "contacto@cafelaplaza.com",
    plan: "Premium",
    estado: "Activo",
    colaboradores: ["Ana", "Carlos"],
  },
  {
    id: "2",
    nombre: "Hotel Las Olas",
    email: "info@hotellasolas.com",
    plan: "Pro",
    estado: "Activo",
    colaboradores: ["María"],
  },
  {
    id: "3",
    nombre: "Panadería Dulce Vida",
    email: "dulcevida@gmail.com",
    plan: "Básico",
    estado: "Moroso",
    colaboradores: ["Luis", "Ana"],
  },
  {
    id: "4",
    nombre: "Gimnasio PowerFit",
    email: "admin@powerfit.mx",
    plan: "Pro",
    estado: "Activo",
    colaboradores: ["Ana", "Carlos", "María"],
  },
];

const sampleColaboradores: Colaborador[] = [
  { id: "1", nombre: "Ana", rol: "Diseñadora" },
  { id: "2", nombre: "Carlos", rol: "Editor de Video" },
  { id: "3", nombre: "María", rol: "Community Manager" },
  { id: "4", nombre: "Luis", rol: "Copywriter" },
];

/* ---------- HELPERS ---------- */

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

const getEstadoClasses = (estado: Client["estado"]) => {
  if (estado === "Activo") {
    return "bg-[#6cbe45]/20 text-[#b9f7a6] border border-[#6cbe45]/50";
  }
  if (estado === "Moroso") {
    return "bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/60";
  }
  return "bg-[#4b5563]/40 text-[#e5e7eb] border border-[#9ca3af]/40";
};

/* ---------- MODAL WRAPPER ---------- */

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#fffef9]/60 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#fffef9]/70 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-[#4a4748]/30 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- MAIN COMPONENT ---------- */

export function ClientesGraphView() {
  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Data as state (so we can assign)
  const [clients, setClients] = useState<Client[]>(sampleClients);
  const [colaboradores] = useState<Colaborador[]>(sampleColaboradores);

  // Hover highlight lines
  const [hoveredConnections, setHoveredConnections] = useState<Set<string>>(
    new Set()
  );

  // Refs for SVG line positions
  const clientRefs = useRef<(HTMLDivElement | null)[]>([]);
  const colaboradorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Detail modals
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);

  // Assignment modal
  const [assigningClient, setAssigningClient] = useState<Client | null>(null);
  const [draftAssigned, setDraftAssigned] = useState<string[]>([]);

  const filteredClients = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.nombre.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t)
    );
  }, [clients, searchTerm]);

  const activeColaboradores = useMemo(() => {
    return colaboradores.filter((colab) =>
      filteredClients.some((client) => client.colaboradores.includes(colab.nombre))
    );
  }, [colaboradores, filteredClients]);

  function calculateConnections() {
    const newConnections: Connection[] = [];

    filteredClients.forEach((client, clientIndex) => {
      client.colaboradores.forEach((colaboradorNombre) => {
        const colaboradorIndex = activeColaboradores.findIndex(
          (c) => c.nombre === colaboradorNombre
        );
        if (colaboradorIndex !== -1) {
          newConnections.push({
            clientId: client.id,
            colaboradorNombre,
            clientIndex,
            colaboradorIndex,
          });
        }
      });
    });

    setConnections(newConnections);
  }

  useEffect(() => {
    calculateConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClients, activeColaboradores]);

  const getConnectionColor = (clientId: string, colaboradorNombre: string) => {
    const key = `${clientId}-${colaboradorNombre}`;
    return hoveredConnections.has(key) ? "#ee2346" : "#4a4748";
  };

  const getConnectionOpacity = (clientId: string, colaboradorNombre: string) => {
    const key = `${clientId}-${colaboradorNombre}`;
    if (hoveredConnections.size === 0) return 0.4;
    return hoveredConnections.has(key) ? 1 : 0.15;
  };

  function openAssignModal(client: Client) {
    setAssigningClient(client);
    setDraftAssigned(client.colaboradores);
  }

  function toggleDraftColab(nombre: string) {
    setDraftAssigned((prev) =>
      prev.includes(nombre) ? prev.filter((x) => x !== nombre) : [...prev, nombre]
    );
  }

  function saveAssignments() {
    if (!assigningClient) return;

    setClients((prev) =>
      prev.map((c) =>
        c.id === assigningClient.id ? { ...c, colaboradores: draftAssigned } : c
      )
    );

    // keep selectedClient in sync if it was open
    setSelectedClient((prev) =>
      prev?.id === assigningClient.id ? { ...prev, colaboradores: draftAssigned } : prev
    );

    setAssigningClient(null);
    setDraftAssigned([]);
  }

  function openClientDetails(client: Client) {
    setSelectedColab(null);
    setSelectedClient(client);
  }

  function openColabDetails(colab: Colaborador) {
    setSelectedClient(null);
    setSelectedColab(colab);
  }

  return (
    <div className="w-full flex flex-col gap-4 text-[#fffef9]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#fffef9] mb-1">
            Relación Clientes - Colaboradores
          </h1>
          <p className="text-xs text-[#fffef9]/60">
            Asigna colaboradores a clientes desde aquí y revisa detalles por tarjeta.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-64">
          <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">
            Buscar cliente
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
              <Search size={14} />
            </span>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 pl-8 text-sm bg-[#3d3b3c] text-[#fffef9] border border-[#4a4748]/40 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Graph box */}
      <div className="relative w-full bg-[#3d3b3c] border border-[#4a4748]/40 rounded-xl p-6 min-h-[600px]">
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Clients column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={16} className="text-[#ee2346]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#fffef9]">
                Clientes ({filteredClients.length})
              </h2>
            </div>

            <div className="space-y-3">
              {filteredClients.map((client, index) => (
                <div
                  key={client.id}
                  ref={(el) => {
                    clientRefs.current[index] = el;
                  }}
                  className="bg-[#333132] border border-[#4a4748]/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#ee2346]/40 cursor-pointer"
                  onClick={() => openClientDetails(client)}
                  onMouseEnter={() => {
                    const set = new Set<string>();
                    client.colaboradores.forEach((colab) => set.add(`${client.id}-${colab}`));
                    setHoveredConnections(set);
                  }}
                  onMouseLeave={() => setHoveredConnections(new Set())}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#fffef9] mb-1">
                        {client.nombre}
                      </h3>
                      <p className="text-xs text-[#fffef9]/60 mb-2">
                        {client.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignModal(client);
                      }}
                      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white transition"
                      title="Asignar colaboradores"
                    >
                      <Users size={14} />
                      Asignar
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#fffef9]/70">
                      Plan: {client.plan}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getEstadoClasses(
                        client.estado
                      )}`}
                    >
                      {client.estado}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#4a4748]/40">
                    <span className="text-xs text-[#fffef9]/50">
                      {client.colaboradores.length} colaborador
                      {client.colaboradores.length !== 1 ? "es" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collaborators column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-[#6cbe45]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#fffef9]">
                Colaboradores ({activeColaboradores.length})
              </h2>
            </div>

            <div className="space-y-3">
              {activeColaboradores.map((colaborador, index) => {
                const clientCount = filteredClients.filter((client) =>
                  client.colaboradores.includes(colaborador.nombre)
                ).length;

                return (
                  <div
                    key={colaborador.id}
                    ref={(el) => {
                      colaboradorRefs.current[index] = el;
                    }}
                    className="bg-[#333132] border border-[#4a4748]/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#6cbe45]/40 cursor-pointer"
                    onClick={() => openColabDetails(colaborador)}
                    onMouseEnter={() => {
                      const set = new Set<string>();
                      filteredClients.forEach((client) => {
                        if (client.colaboradores.includes(colaborador.nombre)) {
                          set.add(`${client.id}-${colaborador.nombre}`);
                        }
                      });
                      setHoveredConnections(set);
                    }}
                    onMouseLeave={() => setHoveredConnections(new Set())}
                  >
                    <h3 className="text-sm font-semibold text-[#fffef9] mb-1">
                      {colaborador.nombre}
                    </h3>
                    <p className="text-xs text-[#fffef9]/60 mb-2">
                      {colaborador.rol}
                    </p>

                    <div className="mt-2 pt-2 border-t border-[#4a4748]/40">
                      <span className="text-xs text-[#fffef9]/50">
                        {clientCount} cliente{clientCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SVG overlay */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {connections.map((connection, index) => {
            const clientEl = clientRefs.current[connection.clientIndex];
            const colaboradorEl = colaboradorRefs.current[connection.colaboradorIndex];
            if (!clientEl || !colaboradorEl) return null;

            const clientRect = clientEl.getBoundingClientRect();
            const colaboradorRect = colaboradorEl.getBoundingClientRect();
            const svgRect = clientEl.closest(".relative")?.getBoundingClientRect();
            if (!svgRect) return null;

            const x1 = clientRect.right - svgRect.left;
            const y1 = clientRect.top - svgRect.top + clientRect.height / 2;

            const x2 = colaboradorRect.left - svgRect.left;
            const y2 = colaboradorRect.top - svgRect.top + colaboradorRect.height / 2;

            const key = `${connection.clientId}-${connection.colaboradorNombre}`;

            const distance = x2 - x1;
            const control = distance * 0.5;

            const cx1 = x1 + control;
            const cy1 = y1;

            const cx2 = x2 - control;
            const cy2 = y2;

            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            return (
              <path
                key={`${key}-${index}`}
                d={pathD}
                stroke={getConnectionColor(connection.clientId, connection.colaboradorNombre)}
                strokeWidth={hoveredConnections.has(key) ? 2.5 : 1.5}
                strokeOpacity={getConnectionOpacity(connection.clientId, connection.colaboradorNombre)}
                fill="none"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-[#3d3b3c] border border-[#4a4748]/40 rounded-lg p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#fffef9] mb-2">
          Leyenda
        </h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#6cbe45]/20 border border-[#6cbe45]/50 rounded"></div>
            <span className="text-[#fffef9]/70">Cliente Activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#ee2346]/20 border border-[#ee2346]/60 rounded"></div>
            <span className="text-[#fffef9]/70">Cliente Moroso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#4b5563]/40 border border-[#9ca3af]/40 rounded"></div>
            <span className="text-[#fffef9]/70">Cliente Inactivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#ee2346]"></div>
            <span className="text-[#fffef9]/70">Conexión (hover para resaltar)</span>
          </div>
        </div>
      </div>

      {/* ------------------ CLIENT DETAILS MODAL ------------------ */}
      {selectedClient && (
        <Modal
          title={selectedClient.nombre}
          subtitle={`${selectedClient.email} · Plan ${selectedClient.plan}`}
          onClose={() => setSelectedClient(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const client = selectedClient;
                  setSelectedClient(null);
                  openAssignModal(client);
                }}
                className="rounded-md bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-sm font-semibold text-white transition inline-flex items-center gap-2"
              >
                <Users size={16} />
                Asignar colaboradores
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#fffef9]/60">Estado</span>
                <span
                  className={cx(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    getEstadoClasses(selectedClient.estado)
                  )}
                >
                  {selectedClient.estado}
                </span>
              </div>

              <div className="mt-3 text-xs text-[#fffef9]/70 space-y-1">
                <p>
                  <span className="text-[#fffef9]/50">Email:</span>{" "}
                  {selectedClient.email}
                </p>
                <p>
                  <span className="text-[#fffef9]/50">Plan:</span>{" "}
                  {selectedClient.plan}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
              <div className="text-xs text-[#fffef9]/60 mb-2">
                Colaboradores asignados
              </div>

              {selectedClient.colaboradores.length === 0 ? (
                <p className="text-sm text-[#fffef9]/70">
                  No hay colaboradores asignados.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedClient.colaboradores.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center rounded-full border border-[#6cbe45]/40 bg-[#6cbe45]/15 px-2 py-0.5 text-[11px] font-semibold text-[#6cbe45]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-[#fffef9]/50">
            Tip: en el futuro este modal puede mostrar facturación/estado de pagos y últimas tareas.
          </div>
        </Modal>
      )}

      {/* ------------------ COLAB DETAILS MODAL ------------------ */}
      {selectedColab && (
        <Modal
          title={selectedColab.nombre}
          subtitle={selectedColab.rol}
          onClose={() => setSelectedColab(null)}
          footer={
            <button
              type="button"
              onClick={() => setSelectedColab(null)}
              className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
            >
              Cerrar
            </button>
          }
        >
          <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
            <div className="text-xs text-[#fffef9]/60 mb-2">
              Clientes asignados
            </div>

            {filteredClients.filter((c) => c.colaboradores.includes(selectedColab.nombre))
              .length === 0 ? (
              <p className="text-sm text-[#fffef9]/70">
                No tiene clientes asignados (según el filtro actual).
              </p>
            ) : (
              <div className="space-y-2">
                {filteredClients
                  .filter((c) => c.colaboradores.includes(selectedColab.nombre))
                  .map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-[#4a4748]/40 bg-[#333132] px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#fffef9]">
                          {c.nombre}
                        </span>
                        <span
                          className={cx(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium",
                            getEstadoClasses(c.estado)
                          )}
                        >
                          {c.estado}
                        </span>
                      </div>
                      <p className="text-xs text-[#fffef9]/60">{c.plan}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------ ASSIGNMENT MODAL ------------------ */}
      {assigningClient && (
        <Modal
          title={`Asignar colaboradores`}
          subtitle={`Cliente: ${assigningClient.nombre}`}
          onClose={() => {
            setAssigningClient(null);
            setDraftAssigned([]);
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setAssigningClient(null);
                  setDraftAssigned([]);
                }}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveAssignments}
                className="rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-3 py-2 text-sm font-semibold text-white transition inline-flex items-center gap-2"
              >
                <Check size={16} />
                Guardar
              </button>
            </>
          }
        >
          <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
            <p className="text-xs text-[#fffef9]/60 mb-3">
              Selecciona uno o más colaboradores. Esto actualiza la relación del
              cliente (UI local por ahora).
            </p>

            <div className="grid gap-2 md:grid-cols-2">
              {colaboradores.map((c) => {
                const checked = draftAssigned.includes(c.nombre);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleDraftColab(c.nombre)}
                    className={cx(
                      "rounded-lg border p-3 text-left transition flex items-start justify-between gap-3",
                      checked
                        ? "border-[#6cbe45]/50 bg-[#6cbe45]/10"
                        : "border-[#4a4748]/40 bg-[#333132] hover:bg-[#3a3738]"
                    )}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#fffef9]">
                        {c.nombre}
                      </div>
                      <div className="text-xs text-[#fffef9]/60">{c.rol}</div>
                    </div>

                    <span
                      className={cx(
                        "mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px]",
                        checked
                          ? "border-[#6cbe45]/60 bg-[#6cbe45]/20 text-[#6cbe45]"
                          : "border-[#4a4748]/60 text-[#fffef9]/50"
                      )}
                      aria-hidden="true"
                    >
                      {checked ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[#fffef9]/60">
                Seleccionados:{" "}
                <span className="text-[#fffef9]/80 font-semibold">
                  {draftAssigned.length}
                </span>
              </span>

              <button
                type="button"
                onClick={() => setDraftAssigned([])}
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold border border-[#4a4748]/40 text-[#fffef9]/70 hover:text-white hover:bg-[#3a3738] transition"
              >
                <Plus size={14} />
                Limpiar selección
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
