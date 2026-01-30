"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

import { Shell } from "../../components/Shell";
import KPI from "./KPI";
import TareasChart from "./TareasChart";
import EntregablesChart from "./EntregablesChart";
import SaludMental from "./SaludMental";
import Rendimiento from "./Rendimiento";
import ChilliPoints from "./ChilliPoints";

import { CheckSquare, FileText, Users, User } from "react-feather";

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("force_password_change, temp_password")
        .eq("auth_user_id", user.id)
        .single();


      if (!perfil) {
        router.replace("/auth");
        return;
      }

      if (perfil.force_password_change === true || perfil.temp_password === true) {
        router.replace("/force-password-change");
        return;
      }

      if (!cancelled) setReady(true);
    }

    guard();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#262425] text-white text-sm">
        Verificando sesión…
      </div>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPI icon={<CheckSquare size={26} />} label="Tareas activas" value={14} />
        <KPI icon={<FileText size={26} />} label="Entregables esta semana" value={5} />
        <KPI icon={<Users size={26} />} label="Clientes activos" value={12} />
        <KPI icon={<User size={26} />} label="Colaboradores activos" value={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TareasChart />
        <EntregablesChart />
        <SaludMental />
        <Rendimiento />
        <ChilliPoints />
      </div>
    </Shell>
  );
}
