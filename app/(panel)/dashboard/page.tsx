"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

import KPI from "./KPI";
import TareasChart from "./TareasChart";
import EntregablesChart from "./EntregablesChart";
import SaludMental from "./SaludMental";
import Rendimiento from "./Rendimiento";
import ChilliPoints from "./ChilliPoints";
import SaludMentalModal from "@/components/SaludMentalModal";
import ClienteDashboard from "./ClienteDashboard";

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
  const router   = useRouter();

  const [ready, setReady]             = useState(false);
  const [rol, setRol]                 = useState<string | null>(null);
  const [data, setData]               = useState<DashboardData | null>(null);
  const [clienteData, setClienteData] = useState<any>(null);
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

      if (!cancelled) { setRol(perfil.rol); setReady(true); }

      if (perfil.rol === "ADMIN") {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (res.ok && !cancelled) setData(await res.json());
      }

      if (perfil.rol === "COLABORADOR") {
        const res = await fetch("/api/bienestar/hoy");
        const hoy = await res.json();
        if (hoy.aplica && !hoy.registrado && !cancelled) setShowBienestar(true);
      }

      if (perfil.rol === "CLIENTE") {
        const res = await fetch("/api/cliente/dashboard", { cache: "no-store" });
        if (res.ok && !cancelled) setClienteData(await res.json());
      }
    }

    init();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ss-bg)] text-[var(--ss-text3)] text-sm">
        Verificando sesión…
      </div>
    );
  }

  /* ── CLIENT DASHBOARD ── */
  if (rol === "CLIENTE") {
    return <ClienteDashboard data={clienteData} />;
  }

  /* ── ADMIN / COLABORADOR DASHBOARD ── */
  const kpis = data?.kpis;
  const tc   = data?.tareasChart;
  const ec   = data?.entregablesChart;
  const sm   = data?.saludMental;
  const cp   = data?.chilliPoints;

  return (
    <>
      {showBienestar && <SaludMentalModal onClose={() => setShowBienestar(false)} />}

      <h1 className="text-xl font-semibold mb-6 text-[var(--ss-text)]">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={<CheckSquare size={22} />} label="Tareas activas"          value={kpis?.tareasActivas         ?? "—"} accent="#6cbe45" />
        <KPI icon={<FileText    size={22} />} label="Entregables esta semana" value={kpis?.entregablesEstaSemana ?? "—"} accent="#7dd3fc" />
        <KPI icon={<Users       size={22} />} label="Clientes activos"        value={kpis?.clientesActivos       ?? "—"} accent="#8b5cf6" />
        <KPI icon={<User        size={22} />} label="Colaboradores activos"   value={kpis?.colaboradoresActivos  ?? "—"} accent="#f97316" />
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

      {/* Debug FCM buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch("/api/fcm/test-send", { method: "POST" });
              const data = await res.json();
              console.log("FCM test-send response:", data);
              alert(JSON.stringify(data, null, 2));
            } catch (err) {
              console.error(err);
              alert("Error enviando push");
            }
          }}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-white text-xs font-medium"
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
            } catch (e) {
              console.error(e);
              alert("Error revisando Notification API");
            }
          }}
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-white text-xs font-medium"
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
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-white text-xs font-medium"
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
              if (!token) { alert("No se generó token"); return; }
              const res = await fetch("/api/fcm/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-white text-xs font-medium"
        >
          Registrar push en este dispositivo
        </button>
      </div>
    </>
  );
}
