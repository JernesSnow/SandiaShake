"use client";

import { Shell } from "@/components/Shell";
import { useEffect, useState } from "react";

type Factura = {
  id_factura: number;
  periodo: string;
  total: number;
  saldo: number;
  estado_factura: string;
  fecha_vencimiento: string | null;
};

function formatCRC(n: number) {
  return `₡ ${Number(n || 0).toLocaleString("es-CR")}`;
}

export default function MisFacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selected, setSelected] = useState<Factura | null>(null);
  const [filtro, setFiltro] = useState("todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/mis-facturas?filtro=${filtro}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      setFacturas(json.facturas ?? []);
      setSelected(json.facturas?.[0] ?? null);
      setLoading(false);
    }
    load();
  }, [filtro]);

  return (
    <Shell>
    <div className="flex flex-col gap-4 text-[#fffef9]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl font-semibold">Mis Facturas</h1>

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-[#3d3b3c] text-xs px-3 py-2 rounded-md border border-[#4a4748]/40"
        >
          <option value="todas">Todas</option>
          <option value="pendientes">Pendientes</option>
          <option value="pagadas">Pagadas</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr] gap-4">
        {/* LISTA */}
        <div className="bg-[#333132] rounded-xl border border-[#4a4748]/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4a4748]/60 text-xs font-semibold uppercase text-[#fffef9]/60">
            Facturas
          </div>

          {loading && (
            <div className="p-4 text-xs text-[#fffef9]/60">
              Cargando...
            </div>
          )}

          {!loading && facturas.length === 0 && (
            <div className="p-4 text-xs text-[#fffef9]/60">
              No tienes facturas registradas.
            </div>
          )}

          <div className="divide-y divide-[#4a4748]/50 max-h-[60vh] overflow-y-auto">
            {facturas.map((f) => (
              <button
                key={f.id_factura}
                onClick={() => setSelected(f)}
                className={`w-full text-left px-4 py-3 text-xs hover:bg-[#4a4748]/40 ${
                  selected?.id_factura === f.id_factura
                    ? "bg-[#4a4748]/70"
                    : ""
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">
                      Periodo {f.periodo}
                    </div>
                    <div className="text-[11px] text-[#fffef9]/60">
                      Vence: {f.fecha_vencimiento ?? "—"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div>Total: {formatCRC(f.total)}</div>
                    <div className="text-[#fffef9]/70">
                      Saldo: {formatCRC(f.saldo)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DETALLE */}
        <div className="bg-[#333132] rounded-xl border border-[#4a4748]/50 p-5">
          {!selected && (
            <div className="text-xs text-[#fffef9]/60">
              Selecciona una factura para ver el detalle.
            </div>
          )}

          {selected && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold">
                  Factura #{selected.id_factura}
                </h2>
                <p className="text-xs text-[#fffef9]/60">
                  Periodo {selected.periodo}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs">
                <div className="bg-[#2b2b30] p-4 rounded-lg">
                  <div className="text-[#fffef9]/60">Total</div>
                  <div className="font-semibold">
                    {formatCRC(selected.total)}
                  </div>
                </div>

                <div className="bg-[#2b2b30] p-4 rounded-lg">
                  <div className="text-[#fffef9]/60">Saldo</div>
                  <div className="font-semibold">
                    {formatCRC(selected.saldo)}
                  </div>
                </div>

                <div className="bg-[#2b2b30] p-4 rounded-lg md:col-span-2">
                  <div className="text-[#fffef9]/60">Vencimiento</div>
                  <div className="font-semibold">
                    {selected.fecha_vencimiento ?? "—"}
                  </div>
                </div>
              </div>

              {/* BOTÓN PAGO */}
              {selected.saldo > 0 && (
                <button
                  className="mt-2 px-4 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-xs font-semibold"
                >
                  ¿Cómo pagar?
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </Shell>
  );
}
