// app/clientes/page.tsx
import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function ClientesPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Clientes</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Lista de clientes">
          <p className="text-xs text-slate-600 mb-2">
            Aquí irá la tabla de clientes con búsqueda y filtros.
          </p>
          <button className="rounded-md border px-3 py-2 text-xs hover:bg-slate-50">
            + Nuevo cliente
          </button>
        </SectionCard>

        <SectionCard title="Info básica del cliente seleccionado" />

        <SectionCard title="Colaboradores asignados" />

        <SectionCard title="Estado de plan y entregables restantes" />
      </div>
    </Shell>
  );
}
