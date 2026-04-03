// app/tareas/page.tsx
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function TareasPage() {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--ss-text)]">Tareas</h1>
          <p className="text-xs text-[var(--ss-text3)]">
            Todas las tareas de todos los clientes (vista administrador)
          </p>
        </div>

        <KanbanBoard />
      </div>
    </>
  );
}


