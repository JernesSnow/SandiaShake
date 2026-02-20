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
} from "react-feather";
import { kanbanStyles } from "./kanbanStyles";
import TaskConversationModal from "./TaskConversationModal";

/* ---------- TYPES & STATE ---------- */

export type StatusId =
  | "pendiente"
  | "en_progreso"
  | "en_revision"
  | "aprobada"
  | "archivada";

export type Task = {
  id: string; // ✅ siempre numérico en string (ej: "12")
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

  if (isAdmin) {
    payload.id_colaborador = task.idColaborador ?? null;
  }

  const res = await fetch("/api/admin/tareas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo crear la tarea");
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

/**
 * ✅ FIX CRÍTICO:
 * - Usamos SOLO id_tarea
 * - Si no es numérico, descartamos la fila (evita task.id="undefined")
 */
function apiRowToTask(r: any): Task | null {
  const rawId = r?.id_tarea;
  if (!isNumericId(rawId)) return null;
  const id = String(rawId).trim();

  const statusId = normalizeStatus(r.status_kanban);

  const cliente =
    String(
      r.organizaciones?.nombre ?? r.organizacion?.nombre ?? r.cliente ?? ""
    ) || "";

  const asignadoA =
    String(r.colaborador?.nombre ?? r.usuarios?.nombre ?? r.asignadoA ?? "") ||
    "";

  return {
    id,
    titulo: String(r.titulo ?? ""),
    cliente,
    asignadoA,
    statusId,
    fechaEntrega: r.fecha_entrega ?? undefined,
    mes: r.mes ?? undefined,
    tipoEntregable: normalizeEntregable(r.tipo_entregable),
    prioridad: normalizePrioridad(r.prioridad),
    descripcion: r.descripcion ?? undefined,
    idOrganizacion:
      r.id_organizacion !== undefined && r.id_organizacion !== null
        ? Number(r.id_organizacion)
        : undefined,
    idColaborador:
      r.id_colaborador !== undefined && r.id_colaborador !== null
        ? String(r.id_colaborador)
        : undefined,
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

type OrgOption = { id_organizacion: number; nombre: string };
type ColabOption = { id_usuario: string; nombre: string };
type UnreadRow = { id_tarea: number; unread_count: number };

export function KanbanBoard() {
  const [state, setState] = useState<KanbanState>(emptyState);
  const [searchClient, setSearchClient] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Todas");
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

  const isAdmin = role === "ADMIN";
  const isColab = role === "COLABORADOR";
  const canCreate = isAdmin || isColab;
  const canEdit = isAdmin || isColab;
  const canReassign = isAdmin;
  const canDelete = isAdmin;

  const [conversationTask, setConversationTask] = useState<Task | null>(null);
  const [unreadByTaskId, setUnreadByTaskId] = useState<Record<string, number>>(
    {}
  );

  async function loadUnreadCounts() {
    try {
      const res = await fetch("/api/admin/tareas/comentarios/unread", {
        cache: "no-store",
      });
      const json = await safeJson(res);
      if (!res.ok) return;

      const list: UnreadRow[] = Array.isArray(json?.data) ? json.data : [];
      const map: Record<string, number> = {};
      for (const r of list) map[String(r.id_tarea)] = Number(r.unread_count ?? 0);
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
        if (!tRes.ok)
          throw new Error(tJson?.error ?? "No se pudieron cargar tareas");

        const oJson = await safeJson(oRes);
        if (oRes.ok) {
          const list = Array.isArray(oJson?.data) ? oJson.data : [];
          setOrgs(
            list
              .map((o: any) => ({
                id_organizacion: Number(o.id_organizacion),
                nombre: String(o.nombre ?? ""),
              }))
              .filter((o: any) => Number.isFinite(o.id_organizacion) && o.nombre)
          );
        } else setOrgs([]);

        const uJson = await safeJson(uRes);
        const rolRaw = String(uJson?.perfil?.rol ?? "").toUpperCase();
        const pid = String(uJson?.perfil?.id_usuario ?? "").trim();
        setPerfilId(pid);
        if (rolRaw === "ADMIN") setRole("ADMIN");
        else if (rolRaw === "COLABORADOR") setRole("COLABORADOR");
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
        } else setColabs([]);

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
    )
      return;

    // columnas: solo admin
    if (type === "column") {
      if (!isAdmin) return;
      const newColumnOrder = Array.from(state.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId as StatusId);
      setState({ ...state, columnOrder: newColumnOrder });
      return;
    }

    // tareas: admin/colab
    if (!canEdit) return;

    if (!isNumericId(draggableId)) {
      setSaveErrMsg(`ID de tarea inválido: "${String(draggableId)}"`);
      return;
    }

    const start = state.columns[source.droppableId as StatusId];
    const finish = state.columns[destination.droppableId as StatusId];

    // reorder en misma columna (UI only)
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
        setSaveOkMsg("✅ Estado actualizado");
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
      if (matchesClient && matchesPriority) result[id] = task;
    }
    return result;
  }, [state.tasks, searchClient, priorityFilter]);

  function getVisibleTaskIds(columnId: StatusId) {
    return state.columns[columnId].taskIds.filter((taskId) => filteredTasks[taskId]);
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
      tasks: Object.fromEntries(Object.entries(state.tasks).filter(([k]) => k !== taskId)),
      columns: {
        ...state.columns,
        [col.id]: { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) },
      },
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    deleteTaskInDb(taskId)
      .then(() => {
        setSaveOkMsg("🗑️ Tarea eliminada");
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
      if (!taskInput.idOrganizacion || !Number.isFinite(taskInput.idOrganizacion)) {
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
          if (!created) throw new Error("Formato inválido de API (id_tarea)");

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

          setSaveOkMsg("✅ Tarea creada");
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
        setSaveOkMsg("✅ Cambios guardados");
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
      <div className={kanbanStyles.filtersRow}>
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

        <div className="w-full md:w-auto">
          <button
            type="button"
            onClick={openNewTask}
            disabled={!canCreate}
            className={`${kanbanStyles.primaryButton} w-full md:w-auto justify-center ${
              !canCreate ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              !canCreate
                ? "Solo admin/colaborador puede crear tareas"
                : "Nueva tarea"
            }
          >
            <Plus size={16} />
            Nueva tarea
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[#fffef9]/60 mt-2">Cargando tareas…</div>
      ) : loadErr ? (
        <div className="text-sm text-[#ffb3c2] mt-2">{loadErr}</div>
      ) : null}

      {saveOkMsg ? (
        <div className="text-sm text-[#b9f7a6] mt-2">{saveOkMsg}</div>
      ) : null}
      {saveErrMsg ? (
        <div className="text-sm text-[#ffb3c2] mt-2">{saveErrMsg}</div>
      ) : null}

      <div className={kanbanStyles.boardWrapper}>
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
                  const tasks = visibleTaskIds.map((taskId) => filteredTasks[taskId]);

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
                                !isAdmin ? "Solo admin reordena columnas" : undefined
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
                                  const unread = unreadByTaskId[task.id] ?? 0;
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
                                          } ${!canEdit || !idOk ? "opacity-75" : ""}`}
                                          onClick={() => openTaskDetails(task as Task)}
                                          title={!idOk ? `ID inválido: ${String(task.id)}` : undefined}
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
                                              onClick={(e) => openConversation(task as Task, e)}
                                              className="relative inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
                                              title="Abrir conversación"
                                            >
                                              <MessageCircle size={14} />
                                              Chat
                                              {unread > 0 ? (
                                                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ee2346] text-white text-[10px] flex items-center justify-center">
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
                                                    className="inline mr-1"
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
                                                  onClick={(e) => e.stopPropagation()}
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
      </div>

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
}: TaskModalProps) {
  const [form, setForm] = useState<Task>(task);

  useEffect(() => setForm(task), [task]);

  const isAdmin = role === "ADMIN";
  const isColab = role === "COLABORADOR";
  const canEdit = isAdmin || isColab;
  const readOnly = !canEdit;

  // ✅ CAMBIO CLAVE:
  // - COLABORADOR puede cambiar idOrganizacion al crear
  // - COLABORADOR NO puede cambiar idColaborador (queda él mismo)
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
      if (!form.idOrganizacion || !Number.isFinite(form.idOrganizacion)) {
        return alert("Debes seleccionar una organización.");
      }
      if (isAdmin && colabs.length > 0 && !form.idColaborador) {
        return alert("Debes seleccionar un colaborador.");
      }
    }

    onSave(form);
  }

  const canPickColaborador = isNew && isAdmin && colabs.length > 0;

  // ✅ si es colaborador creando: idColaborador fijo a sí mismo
  useEffect(() => {
    if (!isNew) return;
    if (!isColab) return;
    if (!perfilId) return;

    setForm((prev) => {
      const me = colabs.find((c) => String(c.id_usuario) === String(perfilId));
      return {
        ...prev,
        idColaborador: String(perfilId),
        asignadoA: me?.nombre ?? prev.asignadoA,
      };
    });
  }, [isNew, isColab, perfilId, colabs]);

  // ✅ EXTRA: si es colaborador y solo tiene 1 org asignada, autoseleccionarla
  useEffect(() => {
    if (!isNew) return;
    if (!isColab) return;
    if (!orgs || orgs.length !== 1) return;

    setForm((prev) => {
      const only = orgs[0];
      // si ya está seteada, no tocar
      if (Number(prev.idOrganizacion) === Number(only.id_organizacion)) return prev;
      return {
        ...prev,
        idOrganizacion: Number(only.id_organizacion),
        cliente: String(only.nombre ?? ""),
      };
    });
  }, [isNew, isColab, orgs]);

  return (
    <div className={kanbanStyles.modalOverlay}>
      <div className={kanbanStyles.modalContainer}>
        <div className={kanbanStyles.modalHeader}>
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex flex-col">
              <h2 className={kanbanStyles.modalTitle}>
                {isNew ? "Nueva tarea" : readOnly ? "Detalle de tarea" : "Editar tarea"}
              </h2>
              {!isNew ? (
                <p className="text-[12px] text-[#fffef9]/60 mt-1 line-clamp-1">
                  {form.cliente || "—"} • {form.asignadoA || "—"}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {!isNew ? (
                <button
                  type="button"
                  onClick={() => onOpenChat(form)}
                  className="relative inline-flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                  title="Abrir conversación"
                >
                  <MessageCircle size={16} />
                  Chat
                </button>
              ) : null}

              <button
                className={kanbanStyles.modalClose}
                onClick={onClose}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={kanbanStyles.modalForm}>
          <div className={kanbanStyles.modalGrid}>
            <div>
              <label className={kanbanStyles.label}>Título *</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                value={form.titulo}
                disabled={readOnly}
                onChange={(e) => updateField("titulo", e.target.value)}
              />
            </div>

            {isNew ? (
              <div>
                <label className={kanbanStyles.label}>Organización *</label>
                <select
                  className={kanbanStyles.modalInput}
                  value={form.idOrganizacion ?? ""}
                  disabled={readOnly}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const org = orgs.find((o) => o.id_organizacion === id);
                    updateField("idOrganizacion", id);
                    updateField("cliente", org?.nombre ?? "");
                  }}
                >
                  <option value="" disabled>
                    Selecciona una organización…
                  </option>
                  {orgs.map((o) => (
                    <option key={o.id_organizacion} value={o.id_organizacion}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={kanbanStyles.label}>Cliente</label>
                <input
                  type="text"
                  className={kanbanStyles.modalInput}
                  value={form.cliente}
                  disabled
                />
              </div>
            )}

            <div>
              <label className={kanbanStyles.label}>
                Asignado a {canPickColaborador ? "*" : ""}
              </label>

              {canPickColaborador ? (
                <select
                  className={kanbanStyles.modalInput}
                  value={form.idColaborador ?? ""}
                  disabled={readOnly}
                  onChange={(e) => {
                    const id = String(e.target.value);
                    const c = colabs.find((x) => x.id_usuario === id);
                    updateField("idColaborador", id);
                    updateField("asignadoA", c?.nombre ?? "");
                  }}
                >
                  <option value="" disabled>
                    Selecciona un colaborador…
                  </option>
                  {colabs.map((c) => (
                    <option key={c.id_usuario} value={c.id_usuario}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className={kanbanStyles.modalInput}
                  value={form.asignadoA || "—"}
                  disabled
                />
              )}
            </div>

            <div>
              <label className={kanbanStyles.label}>Mes</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                placeholder="Ej: Febrero 2025"
                value={form.mes ?? ""}
                disabled={readOnly}
                onChange={(e) => updateField("mes", e.target.value)}
              />
            </div>

            <div>
              <label className={kanbanStyles.label}>Tipo de entregable</label>
              <select
                className={kanbanStyles.modalInput}
                value={form.tipoEntregable ?? "Arte"}
                disabled={readOnly}
                onChange={(e) =>
                  updateField(
                    "tipoEntregable",
                    e.target.value as Task["tipoEntregable"]
                  )
                }
              >
                {TIPO_ENTREGABLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={kanbanStyles.label}>Prioridad</label>
              <select
                className={kanbanStyles.modalInput}
                value={form.prioridad ?? "Media"}
                disabled={readOnly}
                onChange={(e) =>
                  updateField("prioridad", e.target.value as Task["prioridad"])
                }
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            <div>
              <label className={kanbanStyles.label}>Estado</label>
              <select
                className={kanbanStyles.modalInput}
                value={form.statusId}
                disabled={readOnly}
                onChange={(e) =>
                  updateField("statusId", e.target.value as StatusId)
                }
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={kanbanStyles.label}>Fecha de entrega</label>
              <input
                type="date"
                className={kanbanStyles.modalInput}
                value={form.fechaEntrega ?? ""}
                disabled={readOnly}
                onChange={(e) => updateField("fechaEntrega", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className={kanbanStyles.label}>
                Carpeta de Google Drive
              </label>
              <input
                type="url"
                className={kanbanStyles.modalInput}
                placeholder="https://drive.google.com/..."
                value={form.googleDriveUrl ?? ""}
                disabled={readOnly}
                onChange={(e) => updateField("googleDriveUrl", e.target.value)}
              />
              <p className="text-[11px] text-[#fffef9]/50 mt-1">
                (Futuro) Este campo se mostrará, pero por ahora no se guarda en la
                BD.
              </p>
            </div>
          </div>

          <div>
            <label className={kanbanStyles.label}>
              Descripción / notas internas
            </label>
            <textarea
              className={kanbanStyles.modalTextarea}
              value={form.descripcion ?? ""}
              disabled={readOnly}
              onChange={(e) => updateField("descripcion", e.target.value)}
            />
          </div>

          <div className={kanbanStyles.modalFooter}>
            {!isNew && isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className={kanbanStyles.modalDelete}
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}

            <div className={kanbanStyles.modalFooterRight}>
              <button
                type="button"
                onClick={onClose}
                className={kanbanStyles.modalSecondaryBtn}
              >
                Cerrar
              </button>

              {canEdit ? (
                <button type="submit" className={kanbanStyles.modalPrimaryBtn}>
                  Guardar
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}