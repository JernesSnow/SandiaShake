"use client";

import { Shell } from "../../components/Shell";
import KPI from "../../app/dashboard/KPI";
import TareasChart from "../../app/dashboard/TareasChart";
import EntregablesChart from "../../app/dashboard/EntregablesChart";
import SaludMental from "./SaludMental";
import Rendimiento from "../../app/dashboard/Rendimiento";
import ChilliPoints from "../../app/dashboard/ChilliPoints";

import { CheckSquare, FileText, Users, User } from "react-feather";

export default function DashboardPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Dashboard</h1>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPI icon={<CheckSquare size={26} className="text-slate-300" />} label="Tareas activas" value={14} />
        <KPI icon={<FileText size={26} className="text-slate-300" />} label="Entregables esta semana" value={5} />
        <KPI icon={<Users size={26} className="text-slate-300" />} label="Clientes activos" value={12} />
        <KPI icon={<User size={26} className="text-slate-300" />} label="Colaboradores activos" value={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <TareasChart />
        <EntregablesChart />
        <SaludMental />
        <Rendimiento />
        <ChilliPoints />

      </div>

      <div className="bg-[#2b2b30] p-6 rounded-xl border border-[#3a3a40] shadow mt-6">
        <h2 className="text-white font-semibold mb-2">Descargar reportes</h2>
        <p className="text-xs text-gray-400 mb-4">
          Reporte mensual consolidado de clientes y rendimiento.
        </p>

        <button className="px-4 py-2 rounded-md bg-[#ee2346] text-white text-sm">
          Descargar reporte mensual
        </button>
      </div>

    </Shell>
  );
}
