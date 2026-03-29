"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MetodosPagosPage() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const res = await fetch("/api/pago-info", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      setData(json);
    }
    run().catch(() => setData(null));
  }, []);

  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#333132] border border-[#4a4748]/40 rounded-xl p-6 text-[#fffef9]">
        <h1 className="text-xl font-semibold mb-3">Métodos de pago</h1>

        <p className="text-sm text-gray-300 mb-4">
          Puede utilizar cualquiera de los siguientes métodos para cancelar
          sus facturas pendientes. Envíe el comprobante al correo indicado.
        </p>

        <div className="text-sm text-gray-200">
          <ul className="space-y-2">
            <li>SINPE Móvil: <b>{data?.sinpe ?? "No disponible"}</b></li>
            <li>Cuenta bancaria: <b>{data?.cuenta ?? "No disponible"}</b></li>
            <li>Titular: <b>{data?.titular ?? "No disponible"}</b></li>
            <li>Enviar comprobante a: <b>{data?.emailComprobante ?? "No disponible"}</b></li>
          </ul>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md bg-[#4a4748] hover:bg-[#5a5758] text-white text-sm font-semibold"
          >
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}
