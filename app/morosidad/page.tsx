"use client";

import { useEffect, useState } from "react";

export default function MorosidadPage() {
  const [data, setData] = useState<any>(null);

 useEffect(() => {
  async function run() {
    const res = await fetch("/api/estado-cuenta", { credentials: "include", cache: "no-store" });
    const json = await res.json();
    setData(json);
  }
  run().catch(() => setData(null));
}, []);

  return (
    <div className="min-h-screen bg-[#252324] text-[#fffef9] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#333132] border border-[#4a4748]/40 rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-3">Acceso bloqueado por falta de pago</h1>

        <p className="text-sm text-gray-300 mb-4">
          Detectamos facturas vencidas. La pagina estara bloqueda temporalmente hasta que se pauguen las facturas pendientes.
          Si ya realizaste el pago, por favor espera unos minutos y presiona "Ya pagué / Reintentar". Si el problema persiste, contáctanos al correo <b>facturacion@sandiaconchile.com</b> o al teléfono <b>+506 1234 5678</b>. 
        </p>

        {data?.facturasMorosas?.length ? (
          <div className="text-sm text-gray-200 space-y-2 mb-4">
            <p className="text-gray-300">Facturas pendientes:</p>
            <ul className="list-disc ml-5">
              {data.facturasMorosas.map((f: any) => (
                <li key={f.id_factura}>
                  Factura del {f.periodo} — saldo:  ₡{f.saldo} — vencimiento: {f.fecha_vencimiento}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="text-sm text-gray-200">
          <p className="text-gray-300 mb-2">¿Cómo pagar?</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>SINPE: <b>{data?.pagoInfo?.sinpe ?? "No disponible"}</b></li>
            <li>
              Transferencia:{" "}
              <b>
                {data?.pagoInfo?.cuenta ?? "No disponible"}
              </b>
            </li>
            <li>
              Titular: <b>{data?.pagoInfo?.titular ?? "No disponible"}</b>
            </li>
            <li>
              Enviar comprobante a:{" "}
              <b>{data?.pagoInfo?.emailComprobante ?? "No disponible"}</b>
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-4 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold"
        >
          Ya pagué / Reintentar
        </button>
        <button
          onClick={() => window.location.href = "/auth"}
          className="mt-3 px-4 py-2 rounded-md bg-[#e04e4e] hover:bg-[#c84343] text-white text-sm font-semibold"
        >
          Regresar
        </button>
      </div>
    </div>
  );
}