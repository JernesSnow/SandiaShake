"use client";

import { useEffect, useState } from "react";

type BannerData = {
  show: boolean;
  type: "info" | "warning" | "danger";
  diasRestantes: number | null;
  fechaVencimiento: string | null;
  saldoPendiente: number | null;
  periodo: string | null;
  idFactura: number | null;
  mensaje: string;
};

export default function MembershipBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/estado-cuenta", {
          cache: "no-store",
        });

        const data = await res.json();

        if (data.banner?.show) {
          setBanner(data.banner);
        }
      } catch (err) {
        console.error("Error cargando banner:", err);
      }
    };

    load();
  }, []);

  if (!banner?.show) return null;

  const style =
    banner.type === "danger"
      ? "bg-red-50 border-red-200 text-red-800"
      : banner.type === "warning"
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 ${style}`}>
      <div className="font-semibold">{banner.mensaje}</div>

      <div className="text-sm mt-1">
        Vence: {banner.fechaVencimiento} · Saldo pendiente: ₡
        {banner.saldoPendiente?.toLocaleString("es-CR")}
      </div>
    </div>
  );
}