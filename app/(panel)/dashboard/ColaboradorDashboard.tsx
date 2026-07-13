"use client";

import { CheckSquare, FileText, Briefcase, Users } from "react-feather";
import KPI from "./KPI";
import TareasChart from "./TareasChart";
import EntregablesChart from "./EntregablesChart";
import MiSaludMental from "./MiSaludMental";
import ChilliPoints from "./ChilliPoints";

type ColaboradorDashboardData = {
  kpis: {
    tareasActivas: number;
    entregablesEstaSemana: number;
    organizacionesAsignadas: number;
    companerosEquipo: number;
  };
  tareasChart: { pendientes: number; enProgreso: number; enRevision: number; atrasadas: number };
  entregablesChart: { aprobados: number; pendientes: number; rechazados: number };
  saludMental: { estadoAnimo: "ESTABLE" | "ATENTO" | "EN_RIESGO"; puntaje: number | null; fechaRevision: string } | null;
  chilliPoints: { totalGanados: number; totalCanjeados: number; disponibles: number };
};

export default function ColaboradorDashboard({ data }: { data: ColaboradorDashboardData | null }) {
  const kpis = data?.kpis;
  const tc = data?.tareasChart;
  const ec = data?.entregablesChart;
  const cp = data?.chilliPoints;

  return (
    <>
      <h1 className="text-xl font-semibold mb-6 text-[var(--ss-text)]">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={<CheckSquare size={22} />} label="Tareas activas"          value={kpis?.tareasActivas          ?? "—"} accent="#6cbe45" />
        <KPI icon={<FileText    size={22} />} label="Entregables esta semana" value={kpis?.entregablesEstaSemana  ?? "—"} accent="#7dd3fc" />
        <KPI icon={<Briefcase   size={22} />} label="Organizaciones asignadas" value={kpis?.organizacionesAsignadas ?? "—"} accent="#8b5cf6" />
        <KPI icon={<Users       size={22} />} label="Compañeros de equipo"    value={kpis?.companerosEquipo       ?? "—"} accent="#f97316" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <TareasChart
          pendientes={tc?.pendientes ?? 0}
          enProgreso={tc?.enProgreso ?? 0}
          enRevision={tc?.enRevision ?? 0}
          atrasadas={tc?.atrasadas ?? 0}
        />
        <EntregablesChart
          aprobados={ec?.aprobados ?? 0}
          pendientes={ec?.pendientes ?? 0}
          rechazados={ec?.rechazados ?? 0}
        />
        <MiSaludMental
          estadoAnimo={data?.saludMental?.estadoAnimo ?? null}
          puntaje={data?.saludMental?.puntaje}
          fechaRevision={data?.saludMental?.fechaRevision}
        />
        <ChilliPoints
          totalGanados={cp?.totalGanados ?? 0}
          totalCanjeados={cp?.totalCanjeados ?? 0}
          disponibles={cp?.disponibles ?? 0}
        />
      </div>
    </>
  );
}
