// app/tareas/page.tsx
import { Shell } from "../../components/Shell";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";

export default function TareasPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold !text-white">Tareas</h1>
          <p className="text-xs text-[#333132]/70">
            Todas las tareas de todos los clientes (vista administrador)
          </p>
        </div>

        <KanbanBoard />
      </div>
    </Shell>
  );
}
