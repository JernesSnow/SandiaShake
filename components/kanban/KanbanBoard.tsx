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

// "eliminada" is a synthetic bucket for soft-deleted tasks — it is never a
// real `status_kanban` value, only a column shown to admins.
export type ColumnId = StatusId | "eliminada";

export type Task = {
  id: string;
  titulo: string;
  cliente: string;
  asignadoA: string;
  statusId: StatusId;
  estadoTarea?: "ACTIVO" | "ELIMINADO";

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
  id: ColumnId;
  titulo: string;
  taskIds: string[];
};

export type KanbanState = {
  tasks: Record<string, Task>;
  columns: Record<ColumnId, Column>;
  columnOrder: ColumnId[];
};

const emptyState: KanbanState = {
  tasks: {},
  columns: {
    pendiente: { id: "pendiente", titulo: "Pendiente", taskIds: [] },
    en_progreso: { id: "en_progreso", titulo: "En progreso", taskIds: [] },
    en_revision: { id: "en_revision", titulo: "En revisión", taskIds: [] },
    aprobada: { id: "aprobada", titulo: "Aprobada", taskIds: [] },
    archivada: { id: "archivada", titulo: "Archivada", taskIds: [] },
    eliminada: { id: "eliminada", titulo: "Eliminadas", taskIds: [] },
  },
  columnOrder: [
    "pendiente",
    "en_progreso",
    "en_revision",
    "aprobada",
    "archivada",
    "eliminada",
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
    return "bg-[#ee2346]/15 text-[#ee2346] border border-[#ee2346]/40";
  if (prio === "Media")
    return "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40";
  if (prio === "Baja")
    return "bg-[#6cbe45]/15 text-[#4a8c2a] dark:text-[#b9f7a6] border border-[#6cbe45]/40";
  return "bg-[var(--ss-raised)] text-[var(--ss-text2)] border border-[var(--ss-border)]";
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

async function restoreTaskInDb(taskId: string) {
  assertNumericId("restoreTaskInDb", taskId);

  const res = await fetch(`/api/admin/tareas/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "ACTIVO" }),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.error ?? "No se pudo restaurar la tarea");
  return json?.data;
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
    estadoTarea: String(r.estado ?? "").toUpperCase() === "ELIMINADO" ? "ELIMINADO" : "ACTIVO",

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

// Translates a drop index from the (possibly filtered) visible list back
// into a position within the full, unfiltered taskIds array.
function mapVisibleIndexToFullIndex(
  fullIdsAfterRemoval: string[],
  visibleIdsAfterRemoval: string[],
  visibleIndex: number
): number {
  if (visibleIndex >= visibleIdsAfterRemoval.length) {
    const lastVisibleId = visibleIdsAfterRemoval[visibleIdsAfterRemoval.length - 1];
    if (lastVisibleId == null) return fullIdsAfterRemoval.length;
    const idx = fullIdsAfterRemoval.indexOf(lastVisibleId);
    return idx === -1 ? fullIdsAfterRemoval.length : idx + 1;
  }

  const anchorId = visibleIdsAfterRemoval[visibleIndex];
  const idx = fullIdsAfterRemoval.indexOf(anchorId);
  return idx === -1 ? fullIdsAfterRemoval.length : idx;
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
      eliminada: { ...emptyState.columns.eliminada, taskIds: [] },
    },
    columnOrder: emptyState.columnOrder,
  };

  for (const r of rows ?? []) {
    const t = apiRowToTask(r);
    if (!t) continue;
    next.tasks[t.id] = t;
    const bucket: ColumnId = t.estadoTarea === "ELIMINADO" ? "eliminada" : t.statusId;
    next.columns[bucket].taskIds.push(t.id);
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
  const [savingModal, setSavingModal] = useState(false);
  const [modalErrMsg, setModalErrMsg] = useState("");

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
      newColumnOrder.splice(destination.index, 0, draggableId as ColumnId);
      setState({ ...state, columnOrder: newColumnOrder });
      return;
    }

    if (!canEdit) return;

    if (!isNumericId(draggableId)) {
      setSaveErrMsg(`ID de tarea inválido: "${String(draggableId)}"`);
      return;
    }

    // "Eliminadas" is a read-only trash bucket — restoring/deleting only
    // happens through explicit actions in the task modal, never by dragging.
    if (source.droppableId === "eliminada" || destination.droppableId === "eliminada") {
      return;
    }

    const start = state.columns[source.droppableId as ColumnId];
    const finish = state.columns[destination.droppableId as ColumnId];

    // `source.index`/`destination.index` come from @hello-pangea/dnd and are
    // positions within the currently *visible* (search/priority-filtered)
    // list, not within the full unfiltered taskIds array below — so we always
    // remove the dragged id by value (never by index) to avoid splicing out
    // the wrong task and leaving a duplicate behind, then translate the drop
    // position back into full-array space just for visual ordering.
    if (start.id === finish.id) {
      const visibleIds = getVisibleTaskIds(start.id);
      const taskIdsAfterRemoval = start.taskIds.filter((id) => id !== draggableId);
      const visibleIdsAfterRemoval = visibleIds.filter((id) => id !== draggableId);
      const insertAt = mapVisibleIndexToFullIndex(
        taskIdsAfterRemoval,
        visibleIdsAfterRemoval,
        destination.index
      );

      const newTaskIds = Array.from(taskIdsAfterRemoval);
      newTaskIds.splice(insertAt, 0, draggableId);
      const newColumn = { ...start, taskIds: newTaskIds };
      setState({
        ...state,
        columns: { ...state.columns, [newColumn.id]: newColumn },
      });
      return;
    }

    const prevState = state;

    const newStart = {
      ...start,
      taskIds: start.taskIds.filter((id) => id !== draggableId),
    };

    const visibleFinishIds = getVisibleTaskIds(finish.id);
    const insertAt = mapVisibleIndexToFullIndex(
      finish.taskIds,
      visibleFinishIds,
      destination.index
    );
    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(insertAt, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };
    const finishStatusId = finish.id as StatusId;

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
          statusId: finishStatusId,
        },
      },
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    persistKanbanStatus(draggableId, finishStatusId)
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

  function getVisibleTaskIds(columnId: ColumnId) {
    return state.columns[columnId].taskIds.filter(
      (taskId) => filteredTasks[taskId]
    );
  }

  function openNewTask() {
    if (!canCreate) return;

    const firstOrg = orgs[0];
    const me = colabs.find((c) => String(c.id_usuario) === String(perfilId));
    const defaultColab = me ?? colabs[0];

    setModalErrMsg("");
    setSavingModal(false);
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
    setModalErrMsg("");
    setSavingModal(false);
    setIsNew(false);
    setEditingTask(task);
  }

  function handleDeleteTask(taskId: string) {
    if (!canDelete) return;

    const task = state.tasks[taskId];
    if (!task || task.estadoTarea === "ELIMINADO") return;

    const prevState = state;
    const col = state.columns[task.statusId];
    const trashCol = state.columns.eliminada;

    // Soft delete: the task moves to the "Eliminadas" column instead of
    // disappearing, so an admin can restore it later.
    setState({
      ...state,
      tasks: {
        ...state.tasks,
        [taskId]: { ...task, estadoTarea: "ELIMINADO" },
      },
      columns: {
        ...state.columns,
        [col.id]: { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) },
        [trashCol.id]: { ...trashCol, taskIds: [...trashCol.taskIds, taskId] },
      },
    });

    setSaveOkMsg("");
    setSaveErrMsg("");

    deleteTaskInDb(taskId)
      .then(() => {
        setSaveOkMsg("Tarea movida a Eliminadas");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
      })
      .catch((err) => {
        console.error(err);
        setSaveErrMsg(err?.message ?? "No se pudo eliminar la tarea");
        setState(prevState);
      });

    setEditingTask(null);
  }

  function handleRestoreTask(taskId: string) {
    if (!isAdmin) return;

    const task = state.tasks[taskId];
    if (!task || task.estadoTarea !== "ELIMINADO") return;

    const prevState = state;
    const trashCol = state.columns.eliminada;
    const targetCol = state.columns[task.statusId];

    setState({
      ...state,
      tasks: {
        ...state.tasks,
        [taskId]: { ...task, estadoTarea: "ACTIVO" },
      },
      columns: {
        ...state.columns,
        [trashCol.id]: {
          ...trashCol,
          taskIds: trashCol.taskIds.filter((id) => id !== taskId),
        },
        [targetCol.id]: { ...targetCol, taskIds: [...targetCol.taskIds, taskId] },
      },
    });

    setModalErrMsg("");
    setSavingModal(true);

    restoreTaskInDb(taskId)
      .then(() => {
        setSaveOkMsg("Tarea restaurada");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
        setEditingTask(null);
        setIsNew(false);
      })
      .catch((err) => {
        console.error(err);
        setModalErrMsg(err?.message ?? "No se pudo restaurar la tarea");
        setState(prevState);
      })
      .finally(() => setSavingModal(false));
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
        setModalErrMsg("Debes seleccionar una organización.");
        return;
      }

      if (isAdmin && colabs.length > 0 && !taskInput.idColaborador) {
        setModalErrMsg("Debes seleccionar un colaborador.");
        return;
      }

      setModalErrMsg("");
      setSavingModal(true);

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
          setEditingTask(null);
          setIsNew(false);
        })
        .catch((err) => {
          console.error(err);
          setModalErrMsg(err?.message ?? "No se pudo crear la tarea");
        })
        .finally(() => setSavingModal(false));

      return;
    }

    try {
      assertNumericId("handleSaveTask", taskInput.id);
    } catch (e: any) {
      setModalErrMsg(e?.message ?? "ID de tarea inválido");
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

    setModalErrMsg("");
    setSavingModal(true);

    persistTaskEdits(taskInput, canReassign)
      .then((row) => {
        const updated = apiRowToTask(row) ?? taskInput;
        setState((prev) => ({
          ...prev,
          tasks: { ...prev.tasks, [taskInput.id]: updated },
        }));
        setSaveOkMsg("Cambios guardados");
        window.setTimeout(() => setSaveOkMsg(""), 1500);
        setEditingTask(null);
        setIsNew(false);
      })
      .catch((err) => {
        console.error(err);
        setModalErrMsg(err?.message ?? "No se pudieron guardar los cambios");
        setState(prevState);
      })
      .finally(() => setSavingModal(false));
  }

  // "Eliminadas" (soft-deleted tasks) is only visible to admins.
  const visibleColumnOrder = isAdmin
    ? state.columnOrder
    : state.columnOrder.filter((id) => id !== "eliminada");

  return (
    <div className={kanbanStyles.root}>
      {/* Header + filtros */}
      <div className="mb-4 rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-4 shadow-sm">
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
          <div className="text-[11px] text-[var(--ss-text3)]">
            Rol: <b className="text-[var(--ss-text2)]">{role}</b>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            {loading ? (
              <div className="text-sm text-[var(--ss-text2)]">Cargando tareas…</div>
            ) : loadErr ? (
              <div className="text-sm text-[#ee2346]">{loadErr}</div>
            ) : null}

            {saveOkMsg ? (
              <div className="text-sm text-[#6cbe45]">{saveOkMsg}</div>
            ) : null}
            {saveErrMsg ? (
              <div className="text-sm text-[#ee2346]">{saveErrMsg}</div>
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
                  {visibleColumnOrder.map((columnId, index) => {
                    const column = state.columns[columnId];
                    const isTrashColumn = columnId === "eliminada";
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
                                className={`${kanbanStyles.columnTitle} ${
                                  isTrashColumn ? "text-[#ee2346]" : ""
                                }`}
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

                            <Droppable
                              droppableId={column.id}
                              type="task"
                              isDropDisabled={isTrashColumn}
                            >
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
                                    const isEliminada = task.estadoTarea === "ELIMINADO";

                                    return (
                                      <Draggable
                                        draggableId={task.id}
                                        index={taskIndex}
                                        key={task.id}
                                        isDragDisabled={!canEdit || !idOk || isEliminada}
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
                                              !canEdit || !idOk || isEliminada
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
                                                className="relative inline-flex items-center gap-1 rounded-lg border border-[var(--ss-border)] bg-[var(--ss-raised)] px-2 py-1 text-[11px] transition-colors hover:bg-[var(--ss-raised)]"
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
          saving={savingModal}
          errorMsg={modalErrMsg}
          onClose={() => {
            if (savingModal) return;
            setEditingTask(null);
            setIsNew(false);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onRestore={handleRestoreTask}
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
  saving: boolean;
  errorMsg: string;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onRestore: (taskId: string) => void;
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
  saving,
  errorMsg,
  onClose,
  onSave,
  onDelete,
  onRestore,
  onOpenChat,
  onClientDecision,
}: TaskModalProps) {
  const [form, setForm] = useState<Task>(task);
  const [decisionComment, setDecisionComment] = useState("");
  const [deciding, setDeciding] = useState<"" | "APROBAR" | "RECHAZAR">("");
  const [localErr, setLocalErr] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setForm(task);
    setDecisionComment("");
    setDeciding("");
    setLocalErr("");
    setConfirmDeleteOpen(false);
  }, [task]);

  const isAdmin = role === "ADMIN";
  const isColab = role === "COLABORADOR";
  const isCliente = role === "CLIENTE";

  const isEliminada = form.estadoTarea === "ELIMINADO";
  const canEdit = (isAdmin || isColab) && !isEliminada;
  const readOnly = !canEdit;

  function updateField<K extends keyof Task>(key: K, value: Task[K]) {
    if (readOnly) return;
    if (!isAdmin && key === "idColaborador") return;

    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    setLocalErr("");

    if (!form.titulo.trim()) {
      setLocalErr("Título es obligatorio.");
      return;
    }

    if (isNew) {
      if (!form.idOrganizacion) {
        setLocalErr("Selecciona una organización.");
        return;
      }
      if (isAdmin && !form.idColaborador) {
        setLocalErr("Selecciona un colaborador.");
        return;
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
      <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[var(--ss-border)] p-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--ss-text)]">
              {isNew ? "Nueva tarea" : form.titulo || "Detalle de tarea"}
            </h2>

            {!isNew && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ss-text2)]">
                <span>{form.cliente || "—"}</span>
                <span>•</span>
                <span>{form.asignadoA || "—"}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {form.tipoEntregable && (
                <span className="rounded-lg bg-[var(--ss-raised)] px-2 py-1 text-xs">
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

              <span className="rounded-xl bg-[#6cbe45]/20 px-2 py-1 text-xs text-[#5aa63d] dark:text-[#c7f9b4]">
                {STATUS_OPTIONS.find((s) => s.id === form.statusId)?.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm hover:bg-[var(--ss-raised)]"
          >
            Cerrar
          </button>
        </div>

        {/* BODY */}
        <form id="task-form" onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
          {/* LEFT SIDE */}
          <div className="w-[55%] space-y-6 overflow-y-auto border-r border-[var(--ss-border)] p-6">
            {isEliminada && (
              <div className="rounded-xl border border-[#ee2346]/30 bg-[#ee2346]/10 px-3 py-2">
                <p className="text-xs text-[#ee2346]">
                  Esta tarea fue eliminada y se encuentra en la columna
                  "Eliminadas". Solo un administrador puede restaurarla.
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--ss-text2)]">
                Información
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* TITLE */}
                <div className="col-span-2">
                  <label className={kanbanStyles.label}>Título *</label>

                  {readOnly ? (
                    <div className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm">
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
                    <div className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm">
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
                    <div className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm">
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
                    <div className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm">
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
                    <div className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-sm">
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
              <h3 className="mb-2 text-sm font-semibold text-[var(--ss-text2)]">
                Descripción
              </h3>

              <textarea
                rows={5}
                className="w-full resize-none rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] p-3 text-sm text-[var(--ss-text)] focus:outline-none focus:ring-2 focus:ring-[#6cbe45]/40"
                value={form.descripcion ?? ""}
                disabled={readOnly}
                onChange={(e) => updateField("descripcion", e.target.value)}
              />
            </div>

            {/* ENTREGABLES */}
            {!isNew && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[var(--ss-text2)]">
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
            <div className="flex flex-1 flex-col bg-[var(--ss-raised)]">
              <div className="flex items-center gap-2 border-b border-[var(--ss-border)] p-4">
                <MessageCircle size={16} />
                <h3 className="text-sm font-semibold text-[var(--ss-text2)]">
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
        <div className="flex flex-col gap-3 border-t border-[var(--ss-border)] p-4">
          {(localErr || errorMsg) && (
            <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/20 px-3 py-2">
              <p className="text-xs text-[#ee2346]">{localErr || errorMsg}</p>
            </div>
          )}

          <div className="flex justify-between">
            {!isNew && isAdmin && !isEliminada && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={saving}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-60"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}

            {!isNew && isAdmin && isEliminada && (
              <button
                type="button"
                onClick={() => onRestore(form.id)}
                disabled={saving}
                className="flex items-center gap-2 text-sm text-[#6cbe45] hover:text-[#5aa63d] disabled:opacity-60"
              >
                {saving ? "Restaurando..." : "Restaurar tarea"}
              </button>
            )}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-4 py-2 disabled:opacity-60"
              >
                Cancelar
              </button>

              {(isAdmin || isColab) && !isEliminada && (
                <button
                  type="submit"
                  form="task-form"
                  disabled={saving}
                  className="rounded-xl bg-[#6cbe45] px-4 py-2 font-medium text-white hover:bg-[#5aa63d] disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ss-text)]">
              Eliminar tarea
            </h3>
            <p className="mt-3 text-sm text-[var(--ss-text2)]">
              Esta tarea pudo haberse generado automáticamente al crear una
              factura, como parte del registro de servicios facturados a la
              organización.
            </p>
            <p className="mt-2 text-sm text-[var(--ss-text2)]">
              Esta es una <strong>eliminación suave (soft delete)</strong>: la
              tarea no se borra de forma permanente, sino que se mueve a la
              columna <strong>"Eliminadas"</strong>, visible solo para
              administradores, y deja de aparecer en el tablero normal. La
              factura y sus montos no se modifican. Un administrador podrá
              restaurarla más adelante desde ahí.
            </p>
            <p className="mt-2 text-sm text-[var(--ss-text2)]">
              Aun así, procede con cuidado: mientras esté eliminada, la tarea
              deja de ser visible para colaboradores y clientes, y cualquier
              flujo o notificación asociado a ella se detiene.
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--ss-text)]">
              ¿Deseas continuar?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-4 py-2 text-sm text-[var(--ss-text)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete(form.id);
                }}
                className="rounded-xl bg-[#ee2346] px-4 py-2 text-sm font-medium text-white hover:bg-[#d8203f]"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-[var(--ss-surface)] px-4 py-3 shadow-lg backdrop-blur-md">

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
        className="flex items-center gap-2 rounded-xl bg-[#6cbe45] px-4 py-2 text-sm font-medium text-white hover:bg-[#5aa63d]"
      >
        Generar reporte
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-4 shadow-xl z-50">

          <p className="mb-2 text-sm text-[var(--ss-text2)]">
            Seleccionar período
          </p>

          <select
            className="w-full rounded-lg border border-[var(--ss-border)] bg-[var(--ss-raised)] px-2 py-2 text-sm text-[var(--ss-text)] mb-3"
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
              className="flex-1 rounded-xl bg-[#ee2346] px-3 py-2 text-sm font-medium text-white hover:bg-[#d8203f]"
            >
              Ver
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 rounded-xl bg-[#6cbe45] px-3 py-2 text-sm font-medium text-white hover:bg-[#5aa63d]"
            >
              Descargar PDF
            </button>

          </div>
        </div>
      )}
    </div>
  );
}