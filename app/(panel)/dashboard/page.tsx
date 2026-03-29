"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

import { Shell } from "@/components/Shell";
import KPI from "./KPI";
import TareasChart from "./TareasChart";
import EntregablesChart from "./EntregablesChart";
import SaludMental from "./SaludMental";
import Rendimiento from "./Rendimiento";
import ChilliPoints from "./ChilliPoints";
import SaludMentalModal from "@/components/SaludMentalModal";

import { CheckSquare, FileText, Users, User } from "react-feather";
import { requestNotificationPermissionAndToken } from "@/lib/firebase/messaging";

type DashboardData = {
  kpis: {
    tareasActivas: number;
    entregablesEstaSemana: number;
    clientesActivos: number;
    colaboradoresActivos: number;
  };
  tareasChart: { pendientes: number; enProgreso: number; enRevision: number; atrasadas: number };
  entregablesChart: { aprobados: number; pendientes: number; rechazados: number };
  saludMental: { estable: number; atento: number; enRiesgo: number; sinRegistro: number };
  rendimiento: { nombre: string; score: number }[];
  chilliPoints: { totalGanados: number; totalCanjeados: number; disponibles: number };
};

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showBienestar, setShowBienestar] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("force_password_change, temp_password, rol")
        .eq("auth_user_id", user.id)
        .single();

      if (!perfil) { router.replace("/auth"); return; }

      if (perfil.force_password_change === true || perfil.temp_password === true) {
        router.replace("/force-password-change");
        return;
      }

      if (!cancelled) setReady(true);

      if (perfil.rol === "ADMIN") {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (res.ok && !cancelled) setData(await res.json());
      }

      if (perfil.rol === "COLABORADOR") {
        const res = await fetch("/api/bienestar/hoy");
        const hoy = await res.json();
        if (hoy.aplica && !hoy.registrado && !cancelled) setShowBienestar(true);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#262425] text-white text-sm">
        Verificando sesión…
      </div>
    );
  }

  const kpis = data?.kpis;
  const tc   = data?.tareasChart;
  const ec   = data?.entregablesChart;
  const sm   = data?.saludMental;
  const cp   = data?.chilliPoints;

  return (
    <>
      {showBienestar && <SaludMentalModal onClose={() => setShowBienestar(false)} />}
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-[#fffef9]">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPI icon={<CheckSquare size={26} />} label="Tareas activas"          value={kpis?.tareasActivas         ?? "—"} />
        <KPI icon={<FileText    size={26} />} label="Entregables esta semana" value={kpis?.entregablesEstaSemana ?? "—"} />
        <KPI icon={<Users       size={26} />} label="Clientes activos"        value={kpis?.clientesActivos       ?? "—"} />
        <KPI icon={<User        size={26} />} label="Colaboradores activos"   value={kpis?.colaboradoresActivos  ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <SaludMental
          estable={sm?.estable ?? 0}
          atento={sm?.atento ?? 0}
          enRiesgo={sm?.enRiesgo ?? 0}
          sinRegistro={sm?.sinRegistro ?? 0}
        />
        <Rendimiento colaboradores={data?.rendimiento ?? []} />
        <ChilliPoints
          totalGanados={cp?.totalGanados ?? 0}
          totalCanjeados={cp?.totalCanjeados ?? 0}
          disponibles={cp?.disponibles ?? 0}
        />
      </div>

      <button
  type="button"
  onClick={async () => {
    try {
      const res = await fetch("/api/fcm/test-send", {
        method: "POST",
      });

      const data = await res.json();
      console.log("FCM test-send response:", data);
      alert(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      alert("Error enviando push");
    }
  }}
  className="mb-4 rounded bg-green-600 px-4 py-2 text-white"
>
  Probar envío push
</button>

<button
  type="button"
  onClick={async () => {
    try {
      const hasNotification = typeof window !== "undefined" && "Notification" in window;
      const permission = hasNotification ? Notification.permission : "no-api";
      alert(`Notification API: ${hasNotification}\nPermiso actual: ${permission}`);
      console.log("Notification API:", hasNotification);
      console.log("Permiso actual:", permission);
    } catch (e) {
      console.error(e);
      alert("Error revisando Notification API");
    }
  }}
  className="mb-4 rounded bg-orange-600 px-4 py-2 text-white"
>
  Diagnóstico notificaciones
</button>

<button
  type="button"
  onClick={async () => {
    try {
      const token = await requestNotificationPermissionAndToken();
      console.log("TOKEN TELEFONO:", token);
      alert(token ? "Token generado" : "No se generó token");
    } catch (e) {
      console.error(e);
      alert("Error generando token");
    }
  }}
  className="mb-4 rounded bg-blue-600 px-4 py-2 text-white"
>
  Generar token push
</button>

<button
  type="button"
  onClick={async () => {
    try {
      if (!("Notification" in window)) {
        alert("Este navegador no soporta Notification API");
        return;
      }

      const permission = await Notification.requestPermission();
      alert(`Permiso después de pedirlo: ${permission}`);

      if (permission !== "granted") return;

      const token = await requestNotificationPermissionAndToken();
      console.log("TOKEN TELEFONO:", token);

      if (!token) {
        alert("No se generó token");
        return;
      }

      const res = await fetch("/api/fcm/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      console.log("Respuesta register:", data);

      alert(`Token generado y enviado al backend.\nRegistro ok: ${res.ok}`);
    } catch (e) {
      console.error(e);
      alert("Error generando o guardando token");
    }
  }}
  className="mb-4 rounded bg-blue-600 px-4 py-2 text-white"
>
  Registrar push en este dispositivo
</button>
    </Shell>
    </>
  );
}
