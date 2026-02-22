// components/kanban/KanbanBoard.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
} from "react-feather";
import { kanbanStyles } from "./kanbanStyles";

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

type OrgOption = {
  id_organizacion: number;
  nombre: string;
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
  columnOrder: ["pendiente", "en_progreso", "en_revision", "aprobada", "archivada"],
};

function buildKanbanState(dbTareas: any[], orgName: string): KanbanState {
  const tasks: Record<string, Task> = {};
  const columns: Record<StatusId, Column> = {
    pendiente: { id: "pendiente", titulo: "Pendiente", taskIds: [] },
    en_progreso: { id: "en_progreso", titulo: "En progreso", taskIds: [] },
    en_revision: { id: "en_revision", titulo: "En revisión", taskIds: [] },
    aprobada: { id: "aprobada", titulo: "Aprobada", taskIds: [] },
    archivada: { id: "archivada", titulo: "Archivada", taskIds: [] },
  };

  for (const t of dbTareas) {
    const id = String(t.id_tarea);
    const statusId = (columns[t.status_kanban as StatusId] ? t.status_kanban : "pendiente") as StatusId;

    tasks[id] = {
      id,
      titulo: t.titulo ?? "",
      cliente: orgName,
      asignadoA: "",
      statusId,
      fechaEntrega: t.fecha_entrega ?? undefined,
      mes: t.mes ?? undefined,
      tipoEntregable: t.tipo_entregable ?? "Otro",
      prioridad: t.prioridad ?? "Media",
      descripcion: t.descripcion ?? undefined,
    };

    columns[statusId].taskIds.push(id);
  }

  return {
    tasks,
    columns,
    columnOrder: ["pendiente", "en_progreso", "en_revision", "aprobada", "archivada"],
  };
}

/* ---------- CONSTANTS & HELPERS ---------- */

type PriorityFilter = "Todas" | "Alta" | "Media" | "Baja";

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

function getPriorityClasses(prio?: Task["prioridad"]) {
  if (prio === "Alta")
    return "bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/60";
  if (prio === "Media")
    return "bg-[#6cbe45]/15 text-[#b9f7a6] border border-[#6cbe45]/50";
  if (prio === "Baja")
    return "bg-[#4b5563]/40 text-[#e5e7eb] border border-[#9ca3af]/40";
  return "bg-[#374151] text-[#e5e7eb] border border-[#4b5563]";
}

/* ---------- MAIN BOARD COMPONENT ---------- */

export function KanbanBoard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [state, setState] = useState<KanbanState>(emptyState);
  const [searchClient, setSearchClient] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Todas");

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [organizaciones, setOrganizaciones] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [loadingTareas, setLoadingTareas] = useState(false);

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        const json = await res.json();

        if (res.ok && json?.rol) {
          setRole(json.rol);
        }
      } catch {
        setRole(null);
      }
    }

    fetchProfile();
  }, []);

  // Fetch tareas when selected org changes
  useEffect(() => {
    if (!role) return;

    async function fetchTareas(url: string) {
      setLoadingTareas(true);
      try {
        const res = await fetch(url);
        const json = await res.json();

        if (res.ok && json?.data) {
          setState(buildKanbanState(json.data, ""));
        } else {
          setState(emptyState);
        }
      } catch {
        setState(emptyState);
      } finally {
        setLoadingTareas(false);
      }
    }

    // CLIENTE → auto-load without org filter
    if (role === "CLIENTE") {
      fetchTareas("/api/admin/tareas");
      return;
    }

    // ADMIN + COLABORADOR → require selected org
    if (!selectedOrgId) {
      setState(emptyState);
      return;
    }

    fetchTareas(`/api/admin/tareas?id_organizacion=${selectedOrgId}`);

  }, [role, selectedOrgId]);

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Reorder columns
    if (type === "column") {
      const newColumnOrder = Array.from(state.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId as StatusId);
      setState({ ...state, columnOrder: newColumnOrder });
      return;
    }

    // Reorder tasks
    const start = state.columns[source.droppableId as StatusId];
    const finish = state.columns[destination.droppableId as StatusId];

    // same column
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

    // move between columns
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
  }

  // 🔍 filter by client + priority
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
    setIsNew(true);
    setEditingTask({
      id: "",
      titulo: "",
      cliente: "",
      asignadoA: "",
      statusId: "pendiente",
      fechaEntrega: "",
      mes: "",
      tipoEntregable: "Arte",
      prioridad: "Media",
      googleDriveUrl: "",
      descripcion: "",
    });
  }

  function openEditTask(task: Task) {
    setIsNew(false);
    setEditingTask(task);
  }

  function handleDeleteTask(taskId: string) {
    const task = state.tasks[taskId];
    if (!task) return;

    const col = state.columns[task.statusId];
    const newTaskIds = col.taskIds.filter((id) => id !== taskId);
    const { [taskId]: _, ...restTasks } = state.tasks;

    setState({
      ...state,
      tasks: restTasks,
      columns: {
        ...state.columns,
        [col.id]: { ...col, taskIds: newTaskIds },
      },
    });
    setEditingTask(null);
  }

  function handleSaveTask(taskInput: Task) {
    if (isNew) {
      const id = `t${Date.now()}`;
      const newTask: Task = { ...taskInput, id };
      const col = state.columns[newTask.statusId];
      const newTaskIds = [...col.taskIds, id];

      setState({
        ...state,
        tasks: {
          ...state.tasks,
          [id]: newTask,
        },
        columns: {
          ...state.columns,
          [col.id]: { ...col, taskIds: newTaskIds },
        },
      });
    } else {
      const prevTask = state.tasks[taskInput.id];
      if (!prevTask) return;

      const oldCol = state.columns[prevTask.statusId];
      const newCol = state.columns[taskInput.statusId];
      let newColumns = { ...state.columns };

      if (oldCol.id === newCol.id) {
        newColumns[oldCol.id] = { ...oldCol };
      } else {
        const oldTaskIds = oldCol.taskIds.filter((id) => id !== taskInput.id);
        const newTaskIds = [...newCol.taskIds, taskInput.id];

        newColumns[oldCol.id] = { ...oldCol, taskIds: oldTaskIds };
        newColumns[newCol.id] = { ...newCol, taskIds: newTaskIds };
      }

      setState({
        ...state,
        tasks: {
          ...state.tasks,
          [taskInput.id]: taskInput,
        },
        columns: newColumns,
      });
    }

    setEditingTask(null);
    setIsNew(false);
  }

  /* ---------- RENDER ---------- */

  return (
    <div className={kanbanStyles.root}>
      {/* Filtros y botón Nueva tarea */}
      <div className={kanbanStyles.filtersRow}>
        {role !== "CLIENTE" && (
        <div className="w-full md:w-60">
          <label className={kanbanStyles.label}>Organización</label>
          <select
            className={kanbanStyles.select}
            value={selectedOrgId}
            onChange={(e) =>
              setSelectedOrgId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Selecciona una organización</option>
            {organizaciones.map((o) => (
              <option key={o.id_organizacion} value={o.id_organizacion}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

        <div className="flex-1">
          <label className={kanbanStyles.label}>Buscar por cliente</label>
          <div className={kanbanStyles.searchWrapper}>
            <span className={kanbanStyles.searchIcon}>
              <Search size={14} />
            </span>
            <input
              type="text"
              className={kanbanStyles.searchInput}
              placeholder=""
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
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
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
            className={`${kanbanStyles.primaryButton} w-full md:w-auto justify-center`}
          >
            <Plus size={16} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loadingTareas && (
        <p className="text-xs text-[#fffef9]/60">Cargando tareas...</p>
      )}

      {/* Empty state when no org selected */}
      {!selectedOrgId && !loadingTareas && (
        <p className="text-xs text-[#fffef9]/60">
          Selecciona una organización para ver sus tareas.
        </p>
      )}

      {/* Kanban board */}
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
                  const tasks = visibleTaskIds.map(
                    (taskId) => filteredTasks[taskId]
                  );

                  return (
                    <Draggable
                      draggableId={column.id}
                      index={index}
                      key={column.id}
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
                                {tasks.map((task, taskIndex) => (
                                  <Draggable
                                    draggableId={task.id}
                                    index={taskIndex}
                                    key={task.id}
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
                                        }`}
                                        onClick={() =>
                                          router.push(`/tareas/${task.id}`)
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
                                                {task.cliente}
                                              </span>
                                              <span className="inline-flex items-center gap-1">
                                                <Edit2 size={11} />
                                                {task.asignadoA}
                                              </span>
                                            </div>
                                          </div>
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
                                ))}
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

      {/* Modal CRUD */}
      {editingTask && (
        <TaskModal
          isNew={isNew}
          task={editingTask}
          onClose={() => {
            setEditingTask(null);
            setIsNew(false);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

/* ---------- MODAL COMPONENT ---------- */

type TaskModalProps = {
  isNew: boolean;
  task: Task;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
};

function TaskModal({ isNew, task, onClose, onSave, onDelete }: TaskModalProps) {
  const [form, setForm] = useState<Task>(task);

  function updateField<K extends keyof Task>(key: K, value: Task[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.cliente.trim() || !form.asignadoA.trim()) {
      alert("Título, cliente y asignado son obligatorios.");
      return;
    }
    onSave(form);
  }

  return (
    <div className={kanbanStyles.modalOverlay}>
      <div className={kanbanStyles.modalContainer}>
        <div className={kanbanStyles.modalHeader}>
          <h2 className={kanbanStyles.modalTitle}>
            {isNew ? "Nueva tarea" : "Editar tarea"}
          </h2>
          <button className={kanbanStyles.modalClose} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className={kanbanStyles.modalForm}>
          <div className={kanbanStyles.modalGrid}>
            <div>
              <label className={kanbanStyles.label}>Título *</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                value={form.titulo}
                onChange={(e) => updateField("titulo", e.target.value)}
              />
            </div>

            <div>
              <label className={kanbanStyles.label}>Cliente *</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                value={form.cliente}
                onChange={(e) => updateField("cliente", e.target.value)}
              />
            </div>

            <div>
              <label className={kanbanStyles.label}>Asignado a *</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                value={form.asignadoA}
                onChange={(e) => updateField("asignadoA", e.target.value)}
              />
            </div>

            <div>
              <label className={kanbanStyles.label}>Mes</label>
              <input
                type="text"
                className={kanbanStyles.modalInput}
                placeholder="Ej: Febrero 2025"
                value={form.mes ?? ""}
                onChange={(e) => updateField("mes", e.target.value)}
              />
            </div>

            <div>
              <label className={kanbanStyles.label}>Tipo de entregable</label>
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
                onChange={(e) =>
                  updateField(
                    "prioridad",
                    e.target.value as Task["prioridad"]
                  )
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
                onChange={(e) =>
                  updateField("googleDriveUrl", e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className={kanbanStyles.label}>
              Descripción / notas internas
            </label>
            <textarea
              className={kanbanStyles.modalTextarea}
              value={form.descripcion ?? ""}
              onChange={(e) => updateField("descripcion", e.target.value)}
            />
          </div>

          <div className={kanbanStyles.modalFooter}>
            {!isNew && (
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
                Cancelar
              </button>
              <button
                type="submit"
                className={kanbanStyles.modalPrimaryBtn}
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
