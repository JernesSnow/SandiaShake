// components/kanban/KanbanBoard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Calendar,
  Edit2,
  Link as LinkIcon,
  Plus,
  Search,
  Trash2,
  User,
  MessageCircle,
  CheckCircle,
  XCircle,
} from "react-feather";
import { kanbanStyles } from "./kanbanStyles";
import TaskConversationModal from "./TaskConversationModal";
import TaskDeliverablesSection from "./TaskDeliverablesSection";

/* ---------- TYPES & STATE ---------- */

export type StatusId =
  | "pendiente"
  | "en_progreso"
  | "en_revision"
  | "aprobada"
  | "archivada";

export type Task = {
  id: string;
  titulo: string;
  cliente: string;
  asignadoA: string;
  statusId: StatusId;

  fechaEntrega?: string;
  mes?: string;
  tipoEntregable?: "Arte" | "Reel" | "Copy" | "Video" | "Carrusel" | "Otro";
  prioridad?: "Alta" | "Media" | "Baja";
  googleDriveUrl?: string;
  descripcion?: string;

  idOrganizacion?: number;
  idColaborador?: string;
};

export type Column = {
  id: StatusId;
  titulo: string;
  taskIds: string[];
};

export type KanbanState = {
  tasks: Record<string, Task>;
  columns: Record<StatusId, Column>;
  columnOrder: StatusId[];
};

const emptyState: KanbanState = {
  tasks: {},
  columns: {
    pendiente: { id: "pendiente", titulo: "Pendiente", taskIds: [] },
    en_progreso: { id: "en_progreso", titulo: "En progreso", taskIds: [] },
    en_revision: { id: "en_revision", titulo: "En revisión", taskIds: [] },
    aprobada: { id: "aprobada", titulo: "Aprobada", taskIds: [] },
    archivada: { id: "archivada", titulo: "Archivada", taskIds: [] },
  },
  columnOrder: [
    "pendiente",
    "en_progreso",
    "en_revision",
    "aprobada",
    "archivada",
  ],
};

/* ---------- CONSTANTS & HELPERS ---------- */

type PriorityFilter = "Todas" | "Alta" | "Media" | "Baja";
type Role = "ADMIN" | "COLABORADOR" | "CLIENTE" | "DESCONOCIDO";

type OrgOption = { id_organizacion: number; nombre: string };
type ColabOption = { id_usuario: string; nombre: string };
type UnreadRow = { id_tarea: number; unread_count: number };

const STATUS_OPTIONS: { id: StatusId; label: string }[] = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_progreso", label: "En progreso" },
  { id: "en_revision", label: "En revisión" },
  { id: "aprobada", label: "Aprobada" },
  { id: "archivada", label: "Archivada" },
];

const TIPO_ENTREGABLE_OPTIONS: Task["tipoEntregable"][] = [
  "Arte",
  "Reel",
  "Copy",
  "Video",
  "Carrusel",
  "Otro",
];

function isNumericId(v: any) {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s);
}

function assertNumericId(label: string, v: any) {
  if (!isNumericId(v)) {
    const msg = `${label}: ID de tarea inválido ("${String(v)}")`;
    console.error(msg);
    throw new Error("ID de tarea inválido");
  }
}

function getPriorityClasses(prio?: Task["prioridad"]) {
  if (prio === "Alta")
    return "bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/60";
  if (prio === "Media")
    return "bg-[#6cbe45]/15 text-[#b9f7a6] border border-[#6cbe45]/50";
  if (prio === "Baja")
    return "bg-[#4b5563]/40 text-[#e5e7eb] border border-[#9ca3af]/40";
  return "bg-[#374151] text-[#e5e7eb] border border-[#4b5563]";
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function persistKanbanStatus(taskId: string, statusId: StatusId) {
  assertNumericId("persistKanbanStatus", taskId);

  const res = await fetch(`/api/admin/tareas/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status_kanban: statusId }),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar el estado");
  return json?.data ?? json;
}

async function persistTaskEdits(task: Task, canReassign: boolean) {
  assertNumericId("persistTaskEdits", task.id);

  const payload: any = {
    titulo: task.titulo,
    descripcion: task.descripcion ?? "",
    status_kanban: task.statusId,
    prioridad: task.prioridad ?? "Media",
    tipo_entregable: task.tipoEntregable ?? null,
    fecha_entrega: task.fechaEntrega ?? null,
    mes: task.mes ?? null,
  };

  if (canReassign) {
    payload.id_organizacion = task.idOrganizacion ?? undefined;
    payload.id_colaborador = task.idColaborador ?? undefined;
  }

  const res = await fetch(`/api/admin/tareas/${task.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar la tarea");
  return json?.data;
}

async function deleteTaskInDb(taskId: string) {
  assertNumericId("deleteTaskInDb", taskId);

  const res = await fetch(`/api/admin/tareas/${taskId}`, { method: "DELETE" });
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo eliminar la tarea");
  return true;
}

async function createTaskInDb(task: Task, isAdmin: boolean) {
  const payload: any = {
    id_organizacion: task.idOrganizacion,
    titulo: task.titulo,
    descripcion: task.descripcion ?? "",
    status_kanban: task.statusId,
    prioridad: task.prioridad ?? "Media",
    tipo_entregable: task.tipoEntregable ?? null,
    fecha_entrega: task.fechaEntrega ?? null,
    mes: task.mes ?? null,
  };

  if (isAdmin) payload.id_colaborador = task.idColaborador ?? null;

  const res = await fetch("/api/admin/tareas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo crear la tarea");
  return json?.data;
}

async function decideTaskInDb(
  taskId: string,
  accion: "APROBAR" | "RECHAZAR",
  comentario: string
) {
  assertNumericId("decideTaskInDb", taskId);

  const res = await fetch(`/api/admin/tareas/${taskId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, comentario }),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la decisión");
  return json?.data;
}

function normalizeStatus(v: any): StatusId {
  const s = String(v ?? "").toLowerCase();
  if (s === "pendiente") return "pendiente";
  if (s === "en_progreso") return "en_progreso";
  if (s === "en_revision") return "en_revision";
  if (s === "aprobada") return "aprobada";
  if (s === "archivada") return "archivada";
  return "pendiente";
}

function normalizePrioridad(v: any): Task["prioridad"] {
  const p = String(v ?? "").toLowerCase();
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "baja") return "Baja";
  return undefined;
}

function normalizeEntregable(v: any): Task["tipoEntregable"] {
  const t = String(v ?? "");
  if (
    t === "Arte" ||
    t === "Reel" ||
    t === "Copy" ||
    t === "Video" ||
    t === "Carrusel" ||
    t === "Otro"
  ) {
    return t;
  }
  return undefined;
}

function apiRowToTask(r: any): Task | null {
  const rawId = r?.id_tarea;
  if (!isNumericId(rawId)) return null;

  return {
    id: String(rawId),
    titulo: String(r.titulo ?? ""),
    cliente: String(r.organizaciones?.nombre ?? ""),
    asignadoA: String(r.colaborador?.nombre ?? ""),
    statusId: normalizeStatus(r.status_kanban),

    fechaEntrega: r.fecha_entrega ?? undefined,
    mes: r.mes ?? undefined,
    tipoEntregable: normalizeEntregable(r.tipo_entregable),
    prioridad: normalizePrioridad(r.prioridad),

    idOrganizacion: r.id_organizacion ?? undefined,
    idColaborador: r.id_colaborador ?? undefined,

    googleDriveUrl: r.drive_folder_url ?? undefined,
    descripcion: r.descripcion ?? undefined,
  };
}

function buildStateFromApi(rows: any[]): KanbanState {
  const next: KanbanState = {
    tasks: {},
    columns: {
      pendiente: { ...emptyState.columns.pendiente, taskIds: [] },
      en_progreso: { ...emptyState.columns.en_progreso, taskIds: [] },
      en_revision: { ...emptyState.columns.en_revision, taskIds: [] },
      aprobada: { ...emptyState.columns.aprobada, taskIds: [] },
      archivada: { ...emptyState.columns.archivada, taskIds: [] },
    },
    columnOrder: emptyState.columnOrder,
  };

  for (const r of rows ?? []) {
    const t = apiRowToTask(r);
    if (!t) continue;
    next.tasks[t.id] = t;
    next.columns[t.statusId].taskIds.push(t.id);
  }

  return next;
}

/* ---------- MAIN BOARD COMPONENT ---------- */

export function KanbanBoard() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<KanbanState>(emptyState);
  const [searchClient, setSearchClient] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("Todas");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [saveOkMsg, setSaveOkMsg] = useState("");
  const [saveErrMsg, setSaveErrMsg] = useState("");

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [colabs, setColabs] = useState<ColabOption[]>([]);

  const [role, setRole] = useState<Role>("DESCONOCIDO");
  const [perfilId, setPerfilId] = useState<string>("");

  const [conversationTask, setConversationTask] = useState<Task | null>(null);
  const [unreadByTaskId, setUnreadByTaskId] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = role === "ADMIN";
  const isColab = role === "COLABORADOR";
  const isCliente = role === "CLIENTE";

  const canCreate = isAdmin || isColab;
  const canEdit = isAdmin || isColab;
  const canReassign = isAdmin;
  const canDelete = isAdmin;

  function openReport() {
  if (isCliente) {
    window.open("/api/reportes/cliente/pdf");
  } else {
    window.open("/api/reportes/admin/pdf");
  }
}

  async function loadUnreadCounts() {
    try {
      const res = await fetch("/api/admin/tareas/[id]/comentarios/unread", {
        cache: "no-store",
      });
      const json = await safeJson(res);
      if (!res.ok) return;

      const list: UnreadRow[] = Array.isArray(json?.data) ? json.data : [];
      const map: Record<string, number> = {};
      for (const r of list) {
        map[String(r.id_tarea)] = Number(r.unread_count ?? 0);
      }
      setUnreadByTaskId(map);
    } catch {
      // no bloquea
    }
  }

  function openConversation(task: Task, e?: React.MouseEvent) {
    e?.stopPropagation();
    setConversationTask(task);
    setUnreadByTaskId((prev) => ({ ...prev, [task.id]: 0 }));
  }

  async function refreshBoard() {
    try {
      const tRes = await fetch("/api/admin/tareas", { cache: "no-store" });
      const tJson = await safeJson(tRes);
      if (!tRes.ok) {
        throw new Error(tJson?.error ?? "No se pudieron cargar tareas");
      }
      setState(buildStateFromApi(tJson?.data ?? []));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadErr("");

      try {
        const [tRes, oRes, uRes, cRes] = await Promise.all([
          fetch("/api/admin/tareas", { cache: "no-store" }),
          fetch("/api/admin/organizaciones", { cache: "no-store" }),
          fetch("/api/admin/usuarios", { cache: "no-store" }),
          fetch("/api/admin/colaboradores", { cache: "no-store" }),
        ]);

        const tJson = await safeJson(tRes);
        if (!tRes.ok) {
          throw new Error(tJson?.error ?? "No se pudieron cargar tareas");
        }

        const oJson = await safeJson(oRes);
        if (oRes.ok) {
          const list = Array.isArray(oJson?.data) ? oJson.data : [];
          setOrgs(
            list
              .map((o: any) => ({
                id_organizacion: Number(o.id_organizacion),
                nombre: String(o.nombre ?? ""),
              }))
              .filter(
                (o: any) => Number.isFinite(o.id_organizacion) && o.nombre
              )
          );
        } else {
          setOrgs([]);
        }

        const uJson = await safeJson(uRes);
        const rolRaw = String(uJson?.perfil?.rol ?? "").toUpperCase();
        const pid = String(uJson?.perfil?.id_usuario ?? "").trim();
        setPerfilId(pid);

        if (rolRaw === "ADMIN") setRole("ADMIN");
        else if (rolRaw === "COLABORADOR") setRole("COLABORADOR");
        else if (rolRaw === "CLIENTE") setRole("CLIENTE");
        else if (rolRaw) setRole(rolRaw as Role);
        else setRole("DESCONOCIDO");

        const cJson = await safeJson(cRes);
        if (cRes.ok) {
          const list = Array.isArray(cJson?.colaboradores)
            ? cJson.colaboradores
            : [];
          setColabs(
            list
              .map((c: any) => ({
                id_usuario: String(c.id_usuario ?? ""),
                nombre: String(c.nombre ?? ""),
              }))
              .filter((c: any) => c.id_usuario && c.nombre)
          );
        } else {
          setColabs([]);
        }

        setState(buildStateFromApi(tJson?.data ?? []));
        loadUnreadCounts();
      } catch (e: any) {
        console.error(e);
        setLoadErr(e?.message ?? "Error al cargar tareas");
        setState(emptyState);
        setRole("DESCONOCIDO");
        setPerfilId("");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "column") {
      if (!isAdmin) return;
      const newColumnOrder = Array.from(state.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId as StatusId);
      setState({ ...state, columnOrder: newColumnOrder });
      return;
    }

    if (!canEdit) return;

    if (!isNumericId(draggableId)) {
      setSaveErrMsg(`ID de tarea inválido: "${String(draggableId)}"`);
      return;
    }

    const start = state.columns[source.droppableId as StatusId];
    const finish = state.columns[destination.droppableId as StatusId];

    if (start.id === finish.id) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...start, taskIds: newTaskIds };
      setState({
        ...state,
        columns: { ...state.columns, [newColumn.id]: newColumn },
      });
      return;
    }

    const prevState = state;

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setState({
      ...state,
      columns: {
        ...state.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
      tasks: {
        ...state.tasks,
        [draggableId]: {
          ...state.tasks[draggableId],
          statusId: finish.id,
        },
      },
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    persistKanbanStatus(draggableId, finish.id)
      .then(() => {
        setSaveOkMsg("Estado actualizado correctamente");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
      })
      .catch((err) => {
        console.error(err);
        setSaveErrMsg(err?.message ?? "No fue posible actualizar el estado");
        setState(prevState);
      });
  }

  const filteredTasks = useMemo(() => {
    const search = searchClient.trim().toLowerCase();
    const result: Record<string, Task> = {};

    for (const [id, task] of Object.entries(state.tasks)) {
      const matchesClient =
        !search || task.cliente.toLowerCase().includes(search);
      const matchesPriority =
        priorityFilter === "Todas" || task.prioridad === priorityFilter;

      if (matchesClient && matchesPriority) {
        result[id] = task;
      }
    }

    return result;
  }, [state.tasks, searchClient, priorityFilter]);

  function getVisibleTaskIds(columnId: StatusId) {
    return state.columns[columnId].taskIds.filter(
      (taskId) => filteredTasks[taskId]
    );
  }

  function openNewTask() {
    if (!canCreate) return;

    const firstOrg = orgs[0];
    const me = colabs.find((c) => String(c.id_usuario) === String(perfilId));
    const defaultColab = me ?? colabs[0];

    setIsNew(true);
    setEditingTask({
      id: "",
      titulo: "",
      cliente: firstOrg?.nombre ?? "",
      asignadoA: defaultColab?.nombre ?? "",
      statusId: "pendiente",
      fechaEntrega: "",
      mes: "",
      tipoEntregable: "Arte",
      prioridad: "Media",
      googleDriveUrl: "",
      descripcion: "",
      idOrganizacion: firstOrg?.id_organizacion,
      idColaborador: defaultColab?.id_usuario,
    });
  }

  function openTaskDetails(task: Task) {
    setIsNew(false);
    setEditingTask(task);
  }

  function handleDeleteTask(taskId: string) {
    if (!canDelete) return;

    const task = state.tasks[taskId];
    if (!task) return;

    const prevState = state;
    const col = state.columns[task.statusId];

    setState({
      ...state,
      tasks: Object.fromEntries(
        Object.entries(state.tasks).filter(([k]) => k !== taskId)
      ),
      columns: {
        ...state.columns,
        [col.id]: { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) },
      },
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    deleteTaskInDb(taskId)
      .then(() => {
        setSaveOkMsg("Tarea eliminada");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
      })
      .catch((err) => {
        console.error(err);
        setSaveErrMsg(err?.message ?? "No se pudo eliminar la tarea");
        setState(prevState);
      });

    setEditingTask(null);
  }

  function handleSaveTask(taskInput: Task) {
    if (!canEdit) {
      setEditingTask(null);
      setIsNew(false);
      return;
    }

    if (isNew) {
      if (
        !taskInput.idOrganizacion ||
        !Number.isFinite(taskInput.idOrganizacion)
      ) {
        alert("Debes seleccionar una organización.");
        return;
      }

      if (isAdmin && colabs.length > 0 && !taskInput.idColaborador) {
        alert("Debes seleccionar un colaborador.");
        return;
      }

      setSaveOkMsg("");
      setSaveErrMsg("");

      createTaskInDb(taskInput, isAdmin)
        .then((row) => {
          const created = apiRowToTask(row);
          if (!created) {
            throw new Error("Formato inválido de API (id_tarea)");
          }

          setState((prev) => {
            const col = prev.columns[created.statusId];
            return {
              ...prev,
              tasks: { ...prev.tasks, [created.id]: created },
              columns: {
                ...prev.columns,
                [col.id]: { ...col, taskIds: [...col.taskIds, created.id] },
              },
            };
          });

          setSaveOkMsg("Tarea creada correctamente");
          window.setTimeout(() => setSaveOkMsg(""), 1500);
        })
        .catch((err) => {
          console.error(err);
          setSaveErrMsg(err?.message ?? "No se pudo crear la tarea");
        });

      setEditingTask(null);
      setIsNew(false);
      return;
    }

    try {
      assertNumericId("handleSaveTask", taskInput.id);
    } catch (e: any) {
      setSaveErrMsg(e?.message ?? "ID de tarea inválido");
      return;
    }

    const prevState = state;
    const prevTask = state.tasks[taskInput.id];
    if (!prevTask) return;

    const oldCol = state.columns[prevTask.statusId];
    const newCol = state.columns[taskInput.statusId];
    let newColumns = { ...state.columns };

    if (oldCol.id !== newCol.id) {
      newColumns[oldCol.id] = {
        ...oldCol,
        taskIds: oldCol.taskIds.filter((id) => id !== taskInput.id),
      };
      newColumns[newCol.id] = {
        ...newCol,
        taskIds: [...newCol.taskIds, taskInput.id],
      };
    }

    setState({
      ...state,
      tasks: { ...state.tasks, [taskInput.id]: taskInput },
      columns: newColumns,
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    persistTaskEdits(taskInput, canReassign)
      .then((row) => {
        const updated = apiRowToTask(row) ?? taskInput;
        setState((prev) => ({
          ...prev,
          tasks: { ...prev.tasks, [taskInput.id]: updated },
        }));
        setSaveOkMsg("Cambios guardados");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
      })
      .catch((err) => {
        console.error(err);
        setSaveErrMsg(err?.message ?? "No se pudieron guardar los cambios");
        setState(prevState);
      });

    setEditingTask(null);
    setIsNew(false);
  }

  return (
    <div className={kanbanStyles.root}>
      {/* Header + filtros */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className={kanbanStyles.label}>Buscar por cliente</label>
            <div className={kanbanStyles.searchWrapper}>
              <span className={kanbanStyles.searchIcon}>
                <Search size={14} />
              </span>
              <input
                type="text"
                className={kanbanStyles.searchInput}
                placeholder="Ej: Café La Plaza"
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-60">
            <label className={kanbanStyles.label}>Filtrar por prioridad</label>
            <select
              className={kanbanStyles.select}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            >
              <option value="Todas">Todas</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
<div className="flex w-full gap-2 md:w-auto">

{isCliente ? (
  <ReporteDropdown isCliente />
) : (
  <ReporteDropdown />
)}

  {/* BOTÓN NUEVA TAREA */}
  {(isAdmin || isColab) && (
    <button
      type="button"
      onClick={openNewTask}
      className={`${kanbanStyles.primaryButton} flex items-center gap-2`}
    >
      <Plus size={16} />
      Nueva tarea
    </button>
  )}

</div>

    </div> 
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-[11px] text-[#fffef9]/45">
            Rol: <b className="text-[#fffef9]/70">{role}</b>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            {loading ? (
              <div className="text-sm text-[#fffef9]/60">Cargando tareas…</div>
            ) : loadErr ? (
              <div className="text-sm text-[#ffb3c2]">{loadErr}</div>
            ) : null}

            {saveOkMsg ? (
              <div className="text-sm text-[#b9f7a6]">{saveOkMsg}</div>
            ) : null}
            {saveErrMsg ? (
              <div className="text-sm text-[#ffb3c2]">{saveErrMsg}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={kanbanStyles.boardWrapper}>
        {!mounted ? null : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable
              droppableId="all-columns"
              direction="horizontal"
              type="column"
            >
              {(provided) => (
                <div
                  className={kanbanStyles.columnsRow}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {state.columnOrder.map((columnId, index) => {
                    const column = state.columns[columnId];
                    const visibleTaskIds = getVisibleTaskIds(columnId);
                    const tasks = visibleTaskIds.map(
                      (taskId) => filteredTasks[taskId]
                    );

                    return (
                      <Draggable
                        draggableId={column.id}
                        index={index}
                        key={column.id}
                        isDragDisabled={!isAdmin}
                      >
                        {(colProvided) => (
                          <div
                            ref={colProvided.innerRef}
                            {...colProvided.draggableProps}
                            className={`${kanbanStyles.columnWrapperBase} ${
                              index % 2 === 0
                                ? kanbanStyles.columnBgEven
                                : kanbanStyles.columnBgOdd
                            }`}
                          >
                            <div className={kanbanStyles.columnHeader}>
                              <h2
                                className={kanbanStyles.columnTitle}
                                {...colProvided.dragHandleProps}
                                title={
                                  !isAdmin
                                    ? "Solo admin reordena columnas"
                                    : undefined
                                }
                              >
                                {column.titulo}
                              </h2>
                              <span className={kanbanStyles.columnCount}>
                                {visibleTaskIds.length}
                              </span>
                            </div>

                            <Droppable droppableId={column.id} type="task">
                              {(taskProvided, snapshot) => (
                                <div
                                  ref={taskProvided.innerRef}
                                  {...taskProvided.droppableProps}
                                  className={`${kanbanStyles.columnDropAreaBase} ${
                                    snapshot.isDraggingOver
                                      ? kanbanStyles.columnDropAreaDragging
                                      : kanbanStyles.columnDropAreaIdle
                                  }`}
                                >
                                  {tasks.map((task, taskIndex) => {
                                    const unread =
                                      unreadByTaskId[task.id] ?? 0;
                                    const idOk = isNumericId(task.id);

                                    return (
                                      <Draggable
                                        draggableId={task.id}
                                        index={taskIndex}
                                        key={task.id}
                                        isDragDisabled={!canEdit || !idOk}
                                      >
                                        {(dragProvided, dragSnapshot) => (
                                          <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            className={`${kanbanStyles.cardBase} ${
                                              dragSnapshot.isDragging
                                                ? kanbanStyles.cardDragging
                                                : kanbanStyles.cardBorderIdle
                                            } ${
                                              !canEdit || !idOk
                                                ? "opacity-75"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              openTaskDetails(task as Task)
                                            }
                                            title={
                                              !idOk
                                                ? `ID inválido: ${String(
                                                    task.id
                                                  )}`
                                                : undefined
                                            }
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <p className={kanbanStyles.cardTitle}>
                                                  {task.titulo}
                                                </p>

                                                <div className={kanbanStyles.cardMetaRow}>
                                                  <span className="inline-flex items-center gap-1">
                                                    <User size={12} />
                                                    {task.cliente || "—"}
                                                  </span>
                                                  <span className="inline-flex items-center gap-1">
                                                    <Edit2 size={11} />
                                                    {task.asignadoA || "—"}
                                                  </span>
                                                </div>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  openConversation(task as Task, e)
                                                }
                                                className="relative inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] transition-colors hover:bg-white/[0.10]"
                                                title="Abrir conversación"
                                              >
                                                <MessageCircle size={14} />
                                                Chat
                                                {unread > 0 ? (
                                                  <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ee2346] px-1 text-[10px] text-white shadow">
                                                    {unread > 99 ? "99+" : unread}
                                                  </span>
                                                ) : null}
                                              </button>
                                            </div>

                                            <div className={kanbanStyles.cardFooterRow}>
                                              <div className={kanbanStyles.cardFooterLeft}>
                                                {task.fechaEntrega && (
                                                  <span className={kanbanStyles.cardMetaText}>
                                                    <Calendar
                                                      size={12}
                                                      className="mr-1 inline"
                                                    />
                                                    {task.fechaEntrega}
                                                  </span>
                                                )}
                                                {task.mes && (
                                                  <span className={kanbanStyles.cardMetaMuted}>
                                                    {task.mes}
                                                  </span>
                                                )}

                                                {task.googleDriveUrl && (
                                                  <a
                                                    href={task.googleDriveUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                    className={kanbanStyles.cardLink}
                                                  >
                                                    <LinkIcon size={12} />
                                                    Drive
                                                  </a>
                                                )}
                                              </div>

                                              <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getPriorityClasses(
                                                  task.prioridad
                                                )}`}
                                              >
                                                {task.prioridad ?? "Sin prio"}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}

                                  {taskProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Modals */}
      {editingTask && (
        <TaskModal
          isNew={isNew}
          task={editingTask}
          orgs={orgs}
          colabs={colabs}
          role={role}
          perfilId={perfilId}
          onClose={() => {
            setEditingTask(null);
            setIsNew(false);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onOpenChat={(t) => {
            setConversationTask(t);
            setUnreadByTaskId((prev) => ({ ...prev, [t.id]: 0 }));
          }}
          onClientDecision={async (t, accion, comentario) => {
            try {
              setSaveOkMsg("");
              setSaveErrMsg("");

              const updatedRow = await decideTaskInDb(
                t.id,
                accion,
                comentario
              );
              const updatedTask = apiRowToTask(updatedRow);
              if (!updatedTask) {
                throw new Error("Respuesta inválida del servidor");
              }

              setState((prev) => {
                const prevTask = prev.tasks[t.id];
                if (!prevTask) return prev;

                const oldCol = prev.columns[prevTask.statusId];
                const newCol = prev.columns[updatedTask.statusId];

                const nextCols = { ...prev.columns };
                if (oldCol.id !== newCol.id) {
                  nextCols[oldCol.id] = {
                    ...oldCol,
                    taskIds: oldCol.taskIds.filter((x) => x !== t.id),
                  };
                  nextCols[newCol.id] = {
                    ...newCol,
                    taskIds: [...newCol.taskIds, t.id],
                  };
                }

                return {
                  ...prev,
                  tasks: { ...prev.tasks, [t.id]: updatedTask },
                  columns: nextCols,
                };
              });

              setSaveOkMsg(
                accion === "APROBAR"
                  ? "Aprobado por el cliente"
                  : "Rechazado por el cliente"
              );
              window.setTimeout(() => setSaveOkMsg(""), 1800);

              setEditingTask(null);
              setIsNew(false);
            } catch (e: any) {
              setSaveErrMsg(
                e?.message ?? "No se pudo registrar la decisión"
              );
            }
          }}
        />
      )}

      {conversationTask && (
        <TaskConversationModal
          taskId={conversationTask.id}
          taskTitle={conversationTask.titulo}
          onClose={() => {
            setConversationTask(null);
            loadUnreadCounts();
          }}
          onTaskUpdated={async () => {
            await refreshBoard();
          }}
        />
      )}
    </div>
  );
}

/* ---------- MODAL COMPONENT ---------- */

type TaskModalProps = {
  isNew: boolean;
  task: Task;
  orgs: OrgOption[];
  colabs: ColabOption[];
  role: Role;
  perfilId: string;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenChat: (task: Task) => void;
  onClientDecision: (
    task: Task,
    accion: "APROBAR" | "RECHAZAR",
    comentario: string
  ) => void;
};

function TaskModal({
  isNew,
  task,
  orgs,
  colabs,
  role,
  perfilId,
  onClose,
  onSave,
  onDelete,
  onOpenChat,
  onClientDecision,
}: TaskModalProps) {
  const [form, setForm] = useState<Task>(task);
  const [decisionComment, setDecisionComment] = useState("");
  const [deciding, setDeciding] = useState<"" | "APROBAR" | "RECHAZAR">("");

  useEffect(() => {
    setForm(task);
    setDecisionComment("");
    setDeciding("");
  }, [task]);

  const isAdmin = role === "ADMIN";
  const isColab = role === "COLABORADOR";
  const isCliente = role === "CLIENTE";

  const canEdit = isAdmin || isColab;
  const readOnly = !canEdit;

  function updateField<K extends keyof Task>(key: K, value: Task[K]) {
    if (readOnly) return;
    if (!isAdmin && key === "idColaborador") return;

    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    if (!form.titulo.trim()) return alert("Título es obligatorio.");

    if (isNew) {
      if (!form.idOrganizacion) return alert("Selecciona una organización.");
      if (isAdmin && !form.idColaborador) {
        return alert("Selecciona un colaborador.");
      }
    }

    onSave(form);
  }

  const canClientDecide =
    isCliente &&
    !isNew &&
    (form.statusId === "en_revision" ||
      form.statusId === "aprobada" ||
      form.statusId === "en_progreso");

  const decisionDisabled = deciding !== "" || !decisionComment.trim();

  async function handleClientDecision(accion: "APROBAR" | "RECHAZAR") {
    const text = decisionComment.trim();
    if (!text) return;

    setDeciding(accion);

    try {
      await onClientDecision(form, accion, text);
    } finally {
      setDeciding("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isNew ? "Nueva tarea" : form.titulo || "Detalle de tarea"}
            </h2>

            {!isNew && (
              <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                <span>{form.cliente || "—"}</span>
                <span>•</span>
                <span>{form.asignadoA || "—"}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {form.tipoEntregable && (
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs">
                  {form.tipoEntregable}
                </span>
              )}

              {form.prioridad && (
                <span
                  className={`rounded-lg px-2 py-1 text-xs ${getPriorityClasses(
                    form.prioridad
                  )}`}
                >
                  {form.prioridad}
                </span>
              )}

              <span className="rounded-lg bg-[#6cbe45]/20 px-2 py-1 text-xs text-[#c7f9b4]">
                {STATUS_OPTIONS.find((s) => s.id === form.statusId)?.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
          {/* LEFT SIDE */}
          <div className="w-[55%] space-y-6 overflow-y-auto border-r border-white/10 p-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white/80">
                Información
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* TITLE */}
                <div className="col-span-2">
                  <label className={kanbanStyles.label}>Título *</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {form.titulo || "—"}
                    </div>
                  ) : (
                    <input
                      className={kanbanStyles.modalInput}
                      value={form.titulo}
                      onChange={(e) => updateField("titulo", e.target.value)}
                    />
                  )}
                </div>

                {/* PRIORITY */}
                <div>
                  <label className={kanbanStyles.label}>Prioridad</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {form.prioridad ?? "—"}
                    </div>
                  ) : (
                    <select
                      className={kanbanStyles.modalInput}
                      value={form.prioridad ?? "Media"}
                      onChange={(e) =>
                        updateField("prioridad", e.target.value as Task["prioridad"])
                      }
                    >
                      <option>Alta</option>
                      <option>Media</option>
                      <option>Baja</option>
                    </select>
                  )}
                </div>

                {/* STATUS */}
                <div>
                  <label className={kanbanStyles.label}>Estado</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {STATUS_OPTIONS.find((s) => s.id === form.statusId)?.label}
                    </div>
                  ) : (
                    <select
                      className={kanbanStyles.modalInput}
                      value={form.statusId}
                      onChange={(e) => updateField("statusId", e.target.value as StatusId)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* DELIVERY DATE */}
                <div>
                  <label className={kanbanStyles.label}>Fecha entrega</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {form.fechaEntrega || "—"}
                    </div>
                  ) : (
                    <input
                      type="date"
                      className={kanbanStyles.modalInput}
                      value={form.fechaEntrega ?? ""}
                      onChange={(e) => updateField("fechaEntrega", e.target.value)}
                    />
                  )}
                </div>

                {/* DELIVERABLE TYPE */}
                <div>
                  <label className={kanbanStyles.label}>Tipo entregable</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {form.tipoEntregable ?? "—"}
                    </div>
                  ) : (
                    <select
                      className={kanbanStyles.modalInput}
                      value={form.tipoEntregable ?? "Arte"}
                      onChange={(e) =>
                        updateField(
                          "tipoEntregable",
                          e.target.value as Task["tipoEntregable"]
                        )
                      }
                    >
                      {TIPO_ENTREGABLE_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white/80">
                Descripción
              </h3>

              <textarea
                rows={5}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6cbe45]/40"
                value={form.descripcion ?? ""}
                disabled={readOnly}
                onChange={(e) => updateField("descripcion", e.target.value)}
              />
            </div>

            {/* ENTREGABLES */}
            {!isNew && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white/80">
                  Entregables
                </h3>

                <TaskDeliverablesSection
                  taskId={form.id}
                  googleDriveUrl={form.googleDriveUrl}
                  role={role}
                />
              </div>
            )}
          </div>

          {/* RIGHT SIDE CHAT */}
          {!isNew && (
            <div className="flex flex-1 flex-col bg-[#0b0d12]">
              <div className="flex items-center gap-2 border-b border-white/10 p-4">
                <MessageCircle size={16} />
                <h3 className="text-sm font-semibold text-white/80">
                  Conversación
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TaskConversationModal
                  taskId={form.id}
                  taskTitle={form.titulo}
                  embedded
                />
              </div>
            </div>
          )}
        </form>

        {/* FOOTER */}
        <div className="flex justify-between border-t border-white/10 p-4">
          {!isNew && isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(form.id)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          )}

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2"
            >
              Cancelar
            </button>

            {(isAdmin || isColab) && (
              <button
                type="submit"
                className="rounded-xl bg-[#6cbe45] px-4 py-2 font-medium text-black hover:bg-[#7bd456]"
              >
                Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function ReporteDropdown({ isCliente = false }: { isCliente?: boolean }) {

  const [open, setOpen] = React.useState(false);
  const [meses, setMeses] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState("");
  const [alertMsg, setAlertMsg] = React.useState("");

const showAlert = (msg: string) => {
  setAlertMsg(msg);

  setTimeout(() => {
    setAlertMsg("");
  }, 3000);
};

  React.useEffect(() => {
    fetch("/api/reportes/meses")
      .then(res => res.json())
      .then(setMeses)
      .catch(() => setMeses([]));
  }, []);


const buildUrl = (preview = false) => {

  const baseUrl = isCliente
    ? "/api/reportes/cliente/pdf"
    : "/api/reportes/admin/pdf";

  if (!selected) {
    return `${baseUrl}${preview ? "?preview=true" : ""}`;
  }

  if (selected === "all") {
    return `${baseUrl}?mes=all${preview ? "&preview=true" : ""}`;
  }

  const { mes, anio } = JSON.parse(selected);

  return `${baseUrl}?mes=${mes}&anio=${anio}${preview ? "&preview=true" : ""}`;
};


const handlePreview = async () => {
  const url = buildUrl(true);

  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type");

    if (!contentType?.includes("application/pdf")) {
      const data = await res.json();

      showAlert(
        data?.message || "No hay tareas en este período para generar el reporte"
      );
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open("", "_blank");

    if (win) {
     win.document.write(`
      <html>
        <head>
          <title>Reporte SandíaShake</title>
        </head>
        <body style="margin:0">
          <iframe src="${blobUrl}" style="width:100%;height:100vh;border:none;"></iframe>
        </body>
      </html>
    `);
    }

  } catch (err) {
    showAlert("Error generando el reporte");
  }

  setOpen(false);
};

//Generar y decargar pdf según rol 
const handleDownload = async () => {
  const url = buildUrl(false);

  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type");

    if (!contentType?.includes("application/pdf")) {
      const data = await res.json();

      showAlert(
        data?.message || "No hay tareas en este período para descargar"
      );
      return;
    }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const disposition = res.headers.get("content-disposition");

      let filename = "reporte.pdf";

      if (disposition && disposition.includes("filename=")) {
        filename = disposition
          .split("filename=")[1]
          .replace(/"/g, "")
          .trim();
      }

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
        } catch (err) {
          showAlert("Error descargando el reporte");
        }

        setOpen(false);
      };
      
  
//Boton para reportes

  return (
    <div className="relative">
    {alertMsg && (
  <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
    <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-[#1a0f12] px-4 py-3 shadow-lg backdrop-blur-md">

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
        ❌
      </div>

      <div>
        <p className="text-sm font-semibold text-red-400">
          No se pudo generar el reporte
        </p>
        <p className="text-xs text-red-300/80">
          {alertMsg}
        </p>
      </div>
    </div>
  </div>
)}

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-[#6cbe45] px-4 py-2 text-sm font-medium text-black hover:bg-[#7bd456]"
      >
        Generar reporte
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0f1117] p-4 shadow-xl z-50">

          <p className="mb-2 text-sm text-white/70">
            Seleccionar período
          </p>

          <select
            className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white mb-3"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Mes actual</option>

            {meses.map((m, i) => (
              <option
                key={i}
                value={
                  m.mes === "all"
                    ? "all"
                    : JSON.stringify({ mes: m.mes, anio: m.anio })
                }
              >
                {m.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">

            <button
              onClick={handlePreview}
              className="flex-1 rounded-lg bg-[#ee2346] px-3 py-2 text-sm font-medium text-white hover:bg-[#ff3b5c]"
            >
              Ver
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 rounded-lg bg-[#6cbe45] px-3 py-2 text-sm font-medium text-black hover:bg-[#7bd456]"
            >
              Descargar PDF
            </button>

          </div>
        </div>
      )}
    </div>
  );
}