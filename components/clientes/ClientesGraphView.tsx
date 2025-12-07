// components/clientes/ClientesGraphView.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { User, Briefcase, Search } from "react-feather";

/**
 * Type definition for a Client
 * Represents a client with their basic information and assigned collaborators
 */
type Client = {
  id: string;
  nombre: string;
  email: string;
  plan: string;
  estado: "Activo" | "Moroso" | "Inactivo";
  colaboradores: string[]; // Array of collaborator names assigned to this client
};

/**
 * Type definition for a Collaborator (Colaborador)
 * Represents a team member who works with clients
 */
type Colaborador = {
  id: string;
  nombre: string;
  rol: string;
};

/**
 * Type definition for a connection line between client and collaborator
 * Used to draw SVG lines connecting nodes in the graph
 */
type Connection = {
  clientId: string;
  colaboradorNombre: string;
  clientIndex: number;
  colaboradorIndex: number;
};

/**
 * Sample data for clients
 * In a real app, this would come from an API or database
 */
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

/**
 * Sample data for collaborators
 * In a real app, this would come from an API or database
 */
const sampleColaboradores: Colaborador[] = [
  { id: "1", nombre: "Ana", rol: "Diseñadora" },
  { id: "2", nombre: "Carlos", rol: "Editor de Video" },
  { id: "3", nombre: "María", rol: "Community Manager" },
  { id: "4", nombre: "Luis", rol: "Copywriter" },
];

/**
 * Main Graph View Component
 * Displays clients on the left and collaborators on the right
 * with connecting lines showing their relationships
 */
export function ClientesGraphView() {
  // State for search filter
  const [searchTerm, setSearchTerm] = useState("");

  // State for clients and collaborators
  const [clients] = useState<Client[]>(sampleClients);
  const [colaboradores] = useState<Colaborador[]>(sampleColaboradores);

  // State for hover effects - tracks which connections are being hovered (can be multiple)
  const [hoveredConnections, setHoveredConnections] = useState<Set<string>>(new Set());

  // Refs to track the positions of client and collaborator nodes
  const clientRefs = useRef<(HTMLDivElement | null)[]>([]);
  const colaboradorRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State to store connection data for drawing lines
  const [connections, setConnections] = useState<Connection[]>([]);

  /**
   * Filter clients based on search term
   * Searches in client name and email
   * Memoized to prevent unnecessary recalculations
   */
  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [clients, searchTerm]
  );

  /**
   * Get all unique collaborators that are assigned to filtered clients
   * This ensures we only show relevant collaborators based on current filters
   * Memoized to prevent unnecessary recalculations
   */
  const activeColaboradores = useMemo(
    () =>
      colaboradores.filter((colab) =>
        filteredClients.some((client) =>
          client.colaboradores.includes(colab.nombre)
        )
      ),
    [colaboradores, filteredClients]
  );

  /**
   * Calculate the connection lines between clients and collaborators
   * This function gets the DOM positions of each node and creates connection data
   */
  const calculateConnections = () => {
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
  };

  /**
   * Effect to calculate connection positions when clients or filters change
   * This runs whenever the filtered clients list changes
   */
  useEffect(() => {
    calculateConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClients, activeColaboradores]);

  /**
   * Get the color for a connection line
   * Returns red (#ee2346) if the connection is hovered, otherwise gray
   */
  const getConnectionColor = (clientId: string, colaboradorNombre: string) => {
    const connectionKey = `${clientId}-${colaboradorNombre}`;
    return hoveredConnections.has(connectionKey) ? "#ee2346" : "#4a4748";
  };

  /**
   * Get the opacity for a connection line
   * Returns full opacity (1) if hovered, otherwise 0.4
   */
  const getConnectionOpacity = (clientId: string, colaboradorNombre: string) => {
    const connectionKey = `${clientId}-${colaboradorNombre}`;
    if (hoveredConnections.size === 0) return 0.4;
    return hoveredConnections.has(connectionKey) ? 1 : 0.15;
  };

  /**
   * Returns the CSS classes for the client status badge
   * Different colors for Activo (green), Moroso (red), and Inactivo (gray)
   */
  const getEstadoClasses = (estado: Client["estado"]) => {
    if (estado === "Activo") {
      return "bg-[#6cbe45]/20 text-[#b9f7a6] border border-[#6cbe45]/50";
    }
    if (estado === "Moroso") {
      return "bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/60";
    }
    return "bg-[#4b5563]/40 text-[#e5e7eb] border border-[#9ca3af]/40";
  };

  return (
    <div className="w-full flex flex-col gap-4 text-[#fffef9]">
      {/* Header section with title and search */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#fffef9] mb-1">
            Relación Clientes - Colaboradores
          </h1>
          <p className="text-xs text-[#fffef9]/60">
            Vista gráfica de clientes y sus colaboradores asignados
          </p>
        </div>

        {/* Search input */}
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

      {/* Main graph visualization area */}
      <div className="relative w-full bg-[#3d3b3c] border border-[#4a4748]/40 rounded-xl p-6 min-h-[600px]">
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Left column - Clients */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={16} className="text-[#ee2346]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#fffef9]">
                Clientes ({filteredClients.length})
              </h2>
            </div>

            {/* Client nodes */}
            <div className="space-y-3">
              {filteredClients.map((client, index) => (
                <div
                  key={client.id}
                  ref={(el) => {
                    clientRefs.current[index] = el;
                  }}
                  className="bg-[#333132] border border-[#4a4748]/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#ee2346]/40"
                  onMouseEnter={() => {
                    // Highlight all connections for this client
                    const newConnections = new Set<string>();
                    client.colaboradores.forEach((colab) => {
                      newConnections.add(`${client.id}-${colab}`);
                    });
                    setHoveredConnections(newConnections);
                  }}
                  onMouseLeave={() => setHoveredConnections(new Set())}
                >
                  {/* Client name */}
                  <h3 className="text-sm font-semibold text-[#fffef9] mb-1">
                    {client.nombre}
                  </h3>

                  {/* Client email */}
                  <p className="text-xs text-[#fffef9]/60 mb-2">
                    {client.email}
                  </p>

                  {/* Client plan and status */}
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

                  {/* Number of assigned collaborators */}
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

          {/* Right column - Collaborators */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-[#6cbe45]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#fffef9]">
                Colaboradores ({activeColaboradores.length})
              </h2>
            </div>

            {/* Collaborator nodes */}
            <div className="space-y-3">
              {activeColaboradores.map((colaborador, index) => {
                // Count how many clients this collaborator is assigned to
                const clientCount = filteredClients.filter((client) =>
                  client.colaboradores.includes(colaborador.nombre)
                ).length;

                return (
                  <div
                    key={colaborador.id}
                    ref={(el) => {
                      colaboradorRefs.current[index] = el;
                    }}
                    className="bg-[#333132] border border-[#4a4748]/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#6cbe45]/40"
                    onMouseEnter={() => {
                      // Highlight all connections for this collaborator
                      const newConnections = new Set<string>();
                      filteredClients.forEach((client) => {
                        if (client.colaboradores.includes(colaborador.nombre)) {
                          newConnections.add(`${client.id}-${colaborador.nombre}`);
                        }
                      });
                      setHoveredConnections(newConnections);
                    }}
                    onMouseLeave={() => setHoveredConnections(new Set())}
                  >
                    {/* Collaborator name */}
                    <h3 className="text-sm font-semibold text-[#fffef9] mb-1">
                      {colaborador.nombre}
                    </h3>

                    {/* Collaborator role */}
                    <p className="text-xs text-[#fffef9]/60 mb-2">
                      {colaborador.rol}
                    </p>

                    {/* Number of assigned clients */}
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

        {/* SVG overlay for connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {connections.map((connection, index) => {
            // Get the DOM elements for client and collaborator nodes
            const clientEl = clientRefs.current[connection.clientIndex];
            const colaboradorEl =
              colaboradorRefs.current[connection.colaboradorIndex];

            // If either element doesn't exist yet, skip drawing this line
            if (!clientEl || !colaboradorEl) return null;

            // Calculate the positions for the connection line
            const clientRect = clientEl.getBoundingClientRect();
            const colaboradorRect = colaboradorEl.getBoundingClientRect();
            const svgRect = clientEl
              .closest(".relative")
              ?.getBoundingClientRect();

            if (!svgRect) return null;

            // Calculate start point (right edge of client node, centered vertically)
            const x1 = clientRect.right - svgRect.left;
            const y1 =
              clientRect.top - svgRect.top + clientRect.height / 2;

            // Calculate end point (left edge of collaborator node, centered vertically)
            const x2 = colaboradorRect.left - svgRect.left;
            const y2 =
              colaboradorRect.top - svgRect.top + colaboradorRect.height / 2;

            // Create a unique key for this connection
            const connectionKey = `${connection.clientId}-${connection.colaboradorNombre}`;

            // Calculate control points for the cubic bezier curve
            // This creates a smooth S-curve between the two points
            const distance = x2 - x1;
            const controlPointOffset = distance * 0.5; // Control how much the curve bends

            // First control point: horizontal offset from start point
            const cx1 = x1 + controlPointOffset;
            const cy1 = y1;

            // Second control point: horizontal offset from end point
            const cx2 = x2 - controlPointOffset;
            const cy2 = y2;

            // Create the SVG path using cubic bezier curve (C command)
            // M = move to start point
            // C = cubic bezier curve with two control points
            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            return (
              <path
                key={`${connectionKey}-${index}`}
                d={pathD}
                stroke={getConnectionColor(
                  connection.clientId,
                  connection.colaboradorNombre
                )}
                strokeWidth={hoveredConnections.has(connectionKey) ? 2.5 : 1.5}
                strokeOpacity={getConnectionOpacity(
                  connection.clientId,
                  connection.colaboradorNombre
                )}
                fill="none"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend section */}
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
    </div>
  );
}
