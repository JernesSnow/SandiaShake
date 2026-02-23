"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../../components/Shell";
import { Folder, Plus, Trash2, Users } from "react-feather";

/* ================= TYPES ================= */

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE";

type Tarea = {
  id_tarea: number;
  titulo: string;
  status_kanban: string;
  tipo_tarea?: string | null;
};

type TaskFolder = {
  id_tarea: number;
  folder_name: string;
  folder_url: string;
};

type Nota = {
  id_nota: number;
  nota: string;
  created_at: string;
  autor?: {
    id_usuario?: number;
    nombre?: string;
    correo?: string;
  } | null;
};

type Colaborador = {
  id_colaborador: number;
  nombre: string;
  correo: string;
};

type Plan = {
  id_plan: number;
  nombre: string;
  precio: number;
  cantidad_arte?: number;
  cantidad_reel?: number;
  cantidad_copy?: number;
  cantidad_video?: number;
  cantidad_carrusel?: number;
};

export default function ClienteDetailClient({ id }: { id: string }) {
  /* ================= STATE ================= */

  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const [facturas, setFacturas] = useState<any[]>([]);
  const [cliente, setCliente] = useState<any>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [taskFolders, setTaskFolders] = useState<TaskFolder[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [todosColaboradores, setTodosColaboradores] = useState<any[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [nuevoColaboradorId, setNuevoColaboradorId] = useState<number | null>(
    null
  );
  const [nuevaNota, setNuevaNota] = useState("");

  /* ================= DEBUG ================= */

  function logDebug(message: string) {
    console.log("[CLIENT_DEBUG]", message);
  }

  function formatCRDate(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("es-CR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  /* =========================================================
     1️⃣ Resolve role + organization (ONLY ONE)
  ========================================================= */

  useEffect(() => {
    if (!id || Array.isArray(id)) return;

    let alive = true;

    async function resolveOrg() {
      try {
        logDebug("Resolving org...");

        const rProfile = await fetch("/api/auth/profile");
        if (!rProfile.ok || !alive) return;

        const profile = await rProfile.json();
        const resolvedRole = (profile?.rol ?? "COLABORADOR") as Role;

        if (!alive) return;

        setRole(resolvedRole);

        // ADMIN / COLABORADOR → use URL
        if (resolvedRole !== "CLIENTE") {
          setResolvedOrgId(String(id));
          logDebug(`Org resolved from URL: ${id}`);
          return;
        }

        // CLIENTE → use organization from profile response
        const ownOrgId = profile?.organizacion?.id_organizacion;

        if (!ownOrgId || !alive) return;

        setResolvedOrgId(String(ownOrgId));
        logDebug(`Org resolved for CLIENTE: ${ownOrgId}`);
      } catch (err) {
        console.error("Resolve org error:", err);
      }
    }

    resolveOrg();

    return () => {
      alive = false;
    };
  }, [id]);

  /* =========================================================
     2️⃣ Load all data (only when org + role ready)
  ========================================================= */

  async function cargarTodo(orgId: string) {
    try {
      logDebug(`Trigger cargarTodo for org ${orgId}`);

      const rOrg = await fetch(`/api/organizacion?id_organizacion=${orgId}`);
      const jOrg = await rOrg.json();
      setCliente(rOrg.ok ? jOrg.organizacion ?? null : null);

      const rPlanes = await fetch("/api/admin/planes-contenido");
      setPlanes((await rPlanes.json())?.data ?? []);

      if (role === "ADMIN") {
        const rUsuarios = await fetch("/api/admin/usuarios");
        if (rUsuarios.ok) {
          const jUsuarios = await rUsuarios.json();
          setTodosColaboradores(
            (jUsuarios?.usuarios ?? []).filter(
              (u: any) => u.rol === "COLABORADOR" && u.estado === "ACTIVO"
            )
          );
        } else {
          setTodosColaboradores([]);
        }
      } else {
        setTodosColaboradores([]);
      }

      const rF = await fetch(
        `/api/admin/facturas/organizacion-id?id_organizacion=${orgId}`
      );
      setFacturas((await rF.json())?.facturas ?? []);

      const rT = await fetch(`/api/admin/tareas?id_organizacion=${orgId}`);
      setTareas((await rT.json())?.data ?? []);

      const rTF = await fetch(
        `/api/admin/google-drive-task-folders?id_organizacion=${orgId}`
      );
      setTaskFolders((await rTF.json())?.data ?? []);

      const rN = await fetch(
        `/api/admin/organizacion-notas?id_organizacion=${orgId}`
      );
      const jN = await rN.json();
      setNotas(rN.ok ? jN?.data ?? [] : []);

      const rC = await fetch(`/api/admin/asignaciones?id_organizacion=${orgId}`);
      setColaboradores((await rC.json())?.data ?? []);
    } catch (err) {
      console.error("Error cargando cliente:", err);
    }
  }

  useEffect(() => {
    if (!resolvedOrgId || !role) return;
    cargarTodo(resolvedOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrgId, role]);

  /* ================= PLAN LOGIC ================= */

  const planActual = cliente?.organizacion_plan_contenido?.[0] ?? null;

  const planConfig = useMemo(() => {
    if (!planActual) return null;
    return planes.find((p) => p.id_plan === planActual.id_plan) ?? null;
  }, [planActual, planes]);

  const tareasPorTipo = useMemo(() => {
    const counter: Record<string, number> = {};
    tareas.forEach((t) => {
      const tipo = t.tipo_tarea ?? "OTRO";
      counter[tipo] = (counter[tipo] ?? 0) + 1;
    });
    return counter;
  }, [tareas]);

  const remainingByType = useMemo(() => {
    if (!planConfig) return {};
    return {
      ARTE: (planConfig.cantidad_arte ?? 0) - (tareasPorTipo.ARTE ?? 0),
      REEL: (planConfig.cantidad_reel ?? 0) - (tareasPorTipo.REEL ?? 0),
      COPY: (planConfig.cantidad_copy ?? 0) - (tareasPorTipo.COPY ?? 0),
      VIDEO: (planConfig.cantidad_video ?? 0) - (tareasPorTipo.VIDEO ?? 0),
      CARRUSEL:
        (planConfig.cantidad_carrusel ?? 0) - (tareasPorTipo.CARRUSEL ?? 0),
    };
  }, [planConfig, tareasPorTipo]);

  /* ================= ACTIONS ================= */

  async function asignarColaborador() {
    if (!nuevoColaboradorId || !resolvedOrgId) return;

    await fetch("/api/admin/asignaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_organizacion: Number(resolvedOrgId),
        id_colaborador: nuevoColaboradorId,
      }),
    });

    setNuevoColaboradorId(null);
    cargarTodo(resolvedOrgId);
  }

  async function removerColaborador(idColaborador: number) {
    if (!resolvedOrgId) return;

    await fetch(
      `/api/admin/asignaciones?id_organizacion=${resolvedOrgId}&id_colaborador=${idColaborador}`,
      { method: "DELETE" }
    );

    cargarTodo(resolvedOrgId);
  }

  async function crearNota() {
    if (!nuevaNota.trim() || !resolvedOrgId) return;

    const r = await fetch("/api/admin/organizacion-notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_organizacion: resolvedOrgId,
        nota: nuevaNota,
      }),
    });

    const j = await r.json();

    if (r.ok) {
      setNotas((prev) => [j.data, ...prev]);
      setNuevaNota("");
    }
  }

  async function eliminarNota(idNota: number) {
    if (!resolvedOrgId || role !== "ADMIN") return;

    // Soft-delete via route DELETE ?id_nota=
    const r = await fetch(
      `/api/admin/organizacion-notas?id_nota=${idNota}`,
      { method: "DELETE" }
    );

    if (r.ok) {
      setNotas((prev) => prev.filter((n) => n.id_nota !== idNota));
    }
  }

  /* ================= SECURITY GUARD ================= */

  if (role === "CLIENTE" && !resolvedOrgId) {
    return (
      <Shell>
        <div className="text-[#fffef9]/60">Cargando cliente...</div>
      </Shell>
    );
  }

  if (!cliente) {
    return (
      <Shell>
        <div className="text-[#fffef9]/60">Cargando cliente...</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-8 text-[#fffef9]">
        {/* ================= HEADER ================= */}
        <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
          <div className="flex justify-between flex-wrap gap-6">
            <div>
              <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
              <p className="text-sm text-[#fffef9]/60">
                {cliente.descripcion || "Cliente activo"}
              </p>
            </div>

            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-[#fffef9]/50">Plan</p>
                <p className="font-semibold">{planConfig?.nombre ?? "Sin plan"}</p>
              </div>

              <div>
                <p className="text-[#fffef9]/50">Tareas totales</p>
                <p className="font-semibold">{tareas.length}</p>
              </div>

              <div>
                <p className="text-[#fffef9]/50">Colaboradores</p>
                <p className="font-semibold">{colaboradores.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= KPI ROW ================= */}
        <div className="grid md:grid-cols-5 gap-4">
          {Object.entries(remainingByType).map(([tipo, restante]) => (
            <div
              key={tipo}
              className="bg-[#2b2b30] p-5 rounded-xl border border-[#4a4748]/40"
            >
              <p className="text-xs text-[#fffef9]/60">{tipo}</p>
              <p className="text-xl font-bold">{restante < 0 ? 0 : restante}</p>
            </div>
          ))}

          <div className="bg-[#2b2b30] p-5 rounded-xl border border-[#4a4748]/40">
            <p className="text-xs text-[#fffef9]/60">Tareas activas</p>
            <p className="text-xl font-bold">
              {
                tareas.filter((t) =>
                  ["pendiente", "en_progreso", "en_revision"].includes(
                    t.status_kanban
                  )
                ).length
              }
            </p>
          </div>
        </div>

        {/* ================= FACTURACIÓN ================= */}
        <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
          <h2 className="font-semibold mb-6">Facturación del cliente</h2>

          {/* KPIs */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1f1f24] p-4 rounded-lg border border-[#4a4748]/30">
              <p className="text-xs text-[#fffef9]/60">Total facturado</p>
              <p className="text-lg font-bold">
                ₡{" "}
                {(facturas ?? [])
                  .reduce((sum, f) => sum + (f.total ?? 0), 0)
                  .toLocaleString("es-CR")}
              </p>
            </div>

            <div className="bg-[#1f1f24] p-4 rounded-lg border border-[#4a4748]/30">
              <p className="text-xs text-[#fffef9]/60">Total pendiente</p>
              <p className="text-lg font-bold text-[#ee2346]">
                ₡{" "}
                {(facturas ?? [])
                  .reduce((sum, f) => sum + (f.saldo ?? 0), 0)
                  .toLocaleString("es-CR")}
              </p>
            </div>

            <div className="bg-[#1f1f24] p-4 rounded-lg border border-[#4a4748]/30">
              <p className="text-xs text-[#fffef9]/60">Facturas vencidas</p>
              <p className="text-lg font-bold">
                {(facturas ?? []).filter((f) => f.estado_factura === "VENCIDA")
                  .length}
              </p>
            </div>

            <div className="bg-[#1f1f24] p-4 rounded-lg border border-[#4a4748]/30">
              <p className="text-xs text-[#fffef9]/60">Facturas pagadas</p>
              <p className="text-lg font-bold">
                {(facturas ?? []).filter((f) => f.estado_factura === "PAGADA")
                  .length}
              </p>
            </div>
          </div>

          {/* Invoice List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto dark-scroll">
            {(facturas ?? []).length === 0 && (
              <div className="text-xs text-[#fffef9]/50">
                Este cliente no tiene facturas registradas.
              </div>
            )}

            {(facturas ?? [])
              .sort((a, b) => b.id_factura - a.id_factura)
              .map((f) => (
                <div
                  key={f.id_factura}
                  className="flex justify-between items-center bg-[#1f1f24] p-3 rounded-lg border border-[#4a4748]/30"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      Factura #{f.id_factura}
                    </p>
                    <p className="text-xs text-[#fffef9]/50">{f.periodo}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ₡ {Number(f.total ?? 0).toLocaleString("es-CR")}
                    </p>
                    <p
                      className={`
                        text-xs
                        ${
                          f.estado_factura === "PAGADA"
                            ? "text-emerald-400"
                            : f.estado_factura === "VENCIDA"
                            ? "text-[#ee2346]"
                            : "text-[#fffef9]/60"
                        }
                      `}
                    >
                      {f.estado_factura}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ================= MAIN GRID ================= */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ================= LEFT ================= */}
          <div className="lg:col-span-2 space-y-8">
            {/* GOOGLE DRIVE */}
            <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
              <h2 className="font-semibold mb-4">Explorador de archivos</h2>

              <div className="bg-[#1f1f24] rounded-lg border border-[#4a4748]/30 divide-y divide-[#4a4748]/30">
                {taskFolders.map((folder) => (
                  <a
                    key={folder.id_tarea}
                    href={folder.folder_url}
                    target="_blank"
                    className="flex justify-between px-4 py-3 hover:bg-[#2b2b30]"
                    rel="noreferrer"
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={16} className="text-[#6cbe45]" />
                      <span>{folder.folder_name}</span>
                    </div>
                    <span className="text-xs text-[#fffef9]/40">Abrir →</span>
                  </a>
                ))}
              </div>
            </div>

            {/* PRODUCCIÓN */}
            <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
              <h2 className="font-semibold mb-4">Producción</h2>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
                <div className="bg-[#1f1f24] border border-[#4a4748]/30 rounded-lg p-3 text-center">
                  <p className="text-[#fffef9]/60">Pendientes</p>
                  <p className="font-semibold">
                    {tareas.filter((t) => t.status_kanban === "pendiente").length}
                  </p>
                </div>

                <div className="bg-[#1f1f24] border border-[#4a4748]/30 rounded-lg p-3 text-center">
                  <p className="text-[#fffef9]/60">En progreso</p>
                  <p className="font-semibold">
                    {
                      tareas.filter((t) => t.status_kanban === "en_progreso")
                        .length
                    }
                  </p>
                </div>

                <div className="bg-[#1f1f24] border border-[#4a4748]/30 rounded-lg p-3 text-center">
                  <p className="text-[#fffef9]/60">Aprobadas</p>
                  <p className="font-semibold">
                    {tareas.filter((t) => t.status_kanban === "aprobada").length}
                  </p>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto dark-scroll">
                {tareas.map((t) => (
                  <div
                    key={t.id_tarea}
                    className="bg-[#1f1f24] p-4 rounded-lg border border-[#4a4748]/30 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">{t.titulo}</p>
                      <p className="text-xs text-[#fffef9]/50">{t.tipo_tarea}</p>
                    </div>

                    <span
                      className={`
                        text-xs uppercase px-3 py-1 rounded-full
                        ${
                          t.status_kanban === "pendiente"
                            ? "bg-zinc-700/60 text-zinc-200 border border-zinc-500/70"
                            : t.status_kanban === "en_progreso"
                            ? "bg-sky-500/15 text-sky-300 border border-sky-400/40"
                            : t.status_kanban === "en_revision"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-400/40"
                            : t.status_kanban === "aprobada"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40"
                            : "bg-zinc-700 text-zinc-300 border border-zinc-500"
                        }
                      `}
                    >
                      {t.status_kanban.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= RIGHT ================= */}
          <div className="space-y-8">
            {/* ================= COLABORADORES ================= */}
            {role !== "CLIENTE" && (
              <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Users size={16} />
                  Equipo asignado
                </h2>

                {/* LISTA DE COLABORADORES */}
                <div className="space-y-3 mb-4">
                  {colaboradores.length === 0 && (
                    <div className="text-xs text-[#fffef9]/50">
                      No hay colaboradores asignados.
                    </div>
                  )}

                  {colaboradores.map((c) => (
                    <div
                      key={c.id_colaborador}
                      className="bg-[#1f1f24] p-3 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-[#fffef9]/60">{c.correo}</div>
                      </div>

                      {/* SOLO ADMIN PUEDE REMOVER */}
                      {role === "ADMIN" && (
                        <button
                          onClick={() => removerColaborador(c.id_colaborador)}
                          className="text-[#ee2346] hover:text-red-400 transition"
                          aria-label="Remover colaborador"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* SOLO ADMIN PUEDE ASIGNAR */}
                {role === "ADMIN" && (
                  <div className="flex gap-2">
                    <select
                      value={nuevoColaboradorId ?? ""}
                      onChange={(e) =>
                        setNuevoColaboradorId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="bg-[#1f1f24] border border-[#4a4748]/40 rounded px-3 py-2 text-sm flex-1"
                    >
                      <option value="">Agregar colaborador</option>
                      {todosColaboradores.map((c) => (
                        <option key={c.id_usuario} value={c.id_usuario}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={asignarColaborador}
                      className="bg-[#6cbe45] hover:bg-[#5aaa3c] transition px-3 rounded"
                      aria-label="Asignar colaborador"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= NOTAS INTERNAS ================= */}
            {role !== "CLIENTE" && (
              <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#4a4748]/40">
                <h2 className="font-semibold mb-4">Notas internas</h2>

                <div className="flex gap-2 mb-4">
                  <textarea
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    className="flex-1 bg-[#1f1f24] border border-[#4a4748]/40 rounded-lg p-2 text-sm"
                    placeholder="Escribe una nota interna…"
                  />
                  <button
                    onClick={crearNota}
                    className="bg-[#ee2346] px-3 rounded-lg"
                    aria-label="Crear nota"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto dark-scroll">
                  {notas.length === 0 && (
                    <div className="text-xs text-[#fffef9]/50">
                      No hay notas internas.
                    </div>
                  )}

                  {notas.map((n) => (
                    <div
                      key={n.id_nota}
                      className="bg-[#1f1f24] p-3 rounded-lg border border-[#4a4748]/30"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-[#fffef9]/55">
                            {n.autor?.nombre ?? "—"}
                            {n.autor?.correo ? (
                              <span className="text-[#fffef9]/35">
                                {" "}
                                · {n.autor.correo}
                              </span>
                            ) : null}
                            {n.created_at ? (
                              <span className="text-[#fffef9]/35">
                                {" "}
                                · {formatCRDate(n.created_at)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* DELETE ONLY ADMIN */}
                        {role === "ADMIN" && (
                          <button
                            onClick={() => eliminarNota(n.id_nota)}
                            className="text-[#ee2346] hover:text-red-400 transition flex-shrink-0"
                            aria-label="Eliminar nota"
                            title="Eliminar nota"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 text-sm whitespace-pre-wrap">
                        {n.nota}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}