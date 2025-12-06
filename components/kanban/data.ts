// components/kanban/data.ts

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
  fechaEntrega?: string; // "YYYY-MM-DD"
  mes?: string; // "Febrero 2025" o "2025-02"
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

// 🔹 Datos de ejemplo
export const initialKanbanState: KanbanState = {
  tasks: {
    t1: {
      id: "t1",
      titulo: "Carrusel mensual Facebook",
      cliente: "Café La Plaza",
      asignadoA: "Ana",
      statusId: "pendiente",
      fechaEntrega: "2025-02-10",
      mes: "Febrero 2025",
      tipoEntregable: "Carrusel",
      prioridad: "Alta",
      googleDriveUrl: "https://drive.google.com/folder1",
      descripcion: "Carrusel de 4 artes para promo del mes.",
    },
    t2: {
      id: "t2",
      titulo: "Reel lanzamiento producto",
      cliente: "Sandía con Chile",
      asignadoA: "Carlos",
      statusId: "en_progreso",
      fechaEntrega: "2025-02-07",
      mes: "Febrero 2025",
      tipoEntregable: "Reel",
      prioridad: "Media",
      googleDriveUrl: "https://drive.google.com/folder2",
    },
    t3: {
      id: "t3",
      titulo: "Arte historias IG",
      cliente: "Hotel Las Olas",
      asignadoA: "María",
      statusId: "en_revision",
      fechaEntrega: "2025-02-05",
      mes: "Febrero 2025",
      tipoEntregable: "Arte",
      prioridad: "Alta",
    },
    t4: {
      id: "t4",
      titulo: "Banner campaña San Valentín",
      cliente: "Panadería Dulce Vida",
      asignadoA: "Luis",
      statusId: "aprobada",
      fechaEntrega: "2025-02-01",
      mes: "Febrero 2025",
      tipoEntregable: "Arte",
      prioridad: "Media",
    },
    t5: {
      id: "t5",
      titulo: "Revisión copy pauta Meta",
      cliente: "Gimnasio PowerFit",
      asignadoA: "Ana",
      statusId: "archivada",
      fechaEntrega: "2025-01-20",
      mes: "Enero 2025",
      tipoEntregable: "Copy",
      prioridad: "Baja",
    },
  },
  columns: {
    pendiente: {
      id: "pendiente",
      titulo: "Pendiente",
      taskIds: ["t1"],
    },
    en_progreso: {
      id: "en_progreso",
      titulo: "En progreso",
      taskIds: ["t2"],
    },
    en_revision: {
      id: "en_revision",
      titulo: "En revisión",
      taskIds: ["t3"],
    },
    aprobada: {
      id: "aprobada",
      titulo: "Aprobada",
      taskIds: ["t4"],
    },
    archivada: {
      id: "archivada",
      titulo: "Archivada",
      taskIds: ["t5"],
    },
  },
  columnOrder: ["pendiente", "en_progreso", "en_revision", "aprobada", "archivada"],
};
