import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function DashboardPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Métricas (SQL views de todos los clientes)">
          <p className="text-xs text-slate-600">
            KPIs globales de tareas y entregables por cliente.
          </p>
        </SectionCard>

        <SectionCard title="Tareas / Entregables de todos los clientes">
          <p className="text-xs text-slate-600">
            Resumen de trabajo en curso y próximos vencimientos.
          </p>
        </SectionCard>

        <SectionCard title="Salud mental de colaboradores">
          <p className="text-xs text-slate-600">
            Resumen de formularios de bienestar enviados.
          </p>
        </SectionCard>

        <SectionCard title="Colaboradores con mejor / peor rendimiento" />
        <SectionCard title="Estado general de Chilli Points" />
        <SectionCard title="Descargar reportes">
          <button className="rounded-md bg-slate-900 text-slate-50 text-xs px-3 py-2 hover:bg-slate-800">
            Descargar reporte mensual
          </button>
        </SectionCard>
      </div>
    </Shell>
  );
}
