import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function CursosPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Cursos</h1>
      <SectionCard title="Listado de cursos (productos)">
        <p className="text-xs text-slate-600 mb-2">
          Aquí va la tabla de cursos disponibles para venta.
        </p>
        <button className="rounded-md border px-3 py-2 text-xs hover:bg-slate-50">
          + Nuevo curso
        </button>
      </SectionCard>
    </Shell>
  );
}
