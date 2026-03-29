"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";

type OrgItem = {
  id_organizacion: number;
  nombre: string;
  estado: string;
};

type FacturaRow = {
  id_factura: number;
  periodo: string | null;
  total: number | null;
  saldo: number | null;
  estado_factura: string | null;
  fecha_vencimiento: string | null;
  estado?: string | null;
  created_at?: string | null;
};

type PagoRow = {
  id_pago: number;
  id_factura: number;
  monto: number | null;
  metodo: string | null;
  referencia: string | null;
  fecha_pago: string | null;
  estado_pago: string | null;
  estado?: string | null;
  created_at?: string | null;
};

export default function HistorialPagosPage() {
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgQuery, setOrgQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facturas, setFacturas] = useState<FacturaRow[]>([]);
  const [pagos, setPagos] = useState<PagoRow[]>([]);

  // 1) Cargar organizaciones (usa el route EXISTENTE: {ok:true, data:[...]} )
  useEffect(() => {
    let cancel = false;

    async function loadOrgs() {
      setLoadingOrgs(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/organizaciones", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Error cargando organizaciones");

        // 👇 el route devuelve "data", no "items"
        const list = (json?.data ?? []) as any[];
        const normalized: OrgItem[] = list
          .map((o) => ({
            id_organizacion: Number(o.id_organizacion),
            nombre: String(o.nombre ?? "—"),
            estado: String(o.estado ?? "ACTIVO"),
          }))
          // opcional: solo activas en el dropdown
          .filter((o) => o.estado !== "ELIMINADO");

        if (!cancel) setOrgs(normalized);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Error cargando organizaciones");
      } finally {
        if (!cancel) setLoadingOrgs(false);
      }
    }

    loadOrgs();
    return () => {
      cancel = true;
    };
  }, []);

  // 2) Filtrar en frontend (sin tocar el route)
  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) => {
      const name = (o.nombre ?? "").toLowerCase();
      const id = String(o.id_organizacion);
      return name.includes(q) || id.includes(q);
    });
  }, [orgs, orgQuery]);

  // 3) Cargar historial cuando seleccionás organización
  useEffect(() => {
    let cancel = false;

    async function loadHistorial(idOrg: number) {
      setLoadingHist(true);
      setError(null);
      setFacturas([]);
      setPagos([]);

      try {
        const res = await fetch(`/api/admin/facturacion/historial?id_organizacion=${idOrg}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Error cargando historial");

        if (!cancel) {
          setFacturas(json.facturas ?? []);
          setPagos(json.pagos ?? []);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Error cargando historial");
      } finally {
        if (!cancel) setLoadingHist(false);
      }
    }

    if (selectedOrgId !== "") loadHistorial(Number(selectedOrgId));

    return () => {
      cancel = true;
    };
  }, [selectedOrgId]);

  const selectedOrgName = useMemo(() => {
    if (selectedOrgId === "") return null;
    return orgs.find((o) => o.id_organizacion === Number(selectedOrgId))?.nombre ?? null;
  }, [orgs, selectedOrgId]);

  return (
    <Shell>
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#fffef9]">Reporte de pagos</h1>
          <p className="text-sm text-[#fffef9]/60">
            Seleccioná una organización y revisá facturas + pagos relacionados.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-[#444242] bg-[#2e2c2d] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs text-[#fffef9]/60 mb-1">Buscar organización</label>
            <input
              value={orgQuery}
              onChange={(e) => setOrgQuery(e.target.value)}
              placeholder="Ej: IBM o 12"
              className="w-full rounded-md bg-[#1f1d1e] border border-[#4a4748]/60 px-3 py-2 text-sm text-[#fffef9] outline-none focus:border-[#ee2346]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-[#fffef9]/60 mb-1">Organización</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-md bg-[#1f1d1e] border border-[#4a4748]/60 px-3 py-2 text-sm text-[#fffef9] outline-none focus:border-[#ee2346]"
            >
              <option value="">
                {loadingOrgs ? "Cargando organizaciones..." : "Seleccioná una organización"}
              </option>

              {filteredOrgs.map((o) => (
                <option key={o.id_organizacion} value={o.id_organizacion}>
                  #{o.id_organizacion} — {o.nombre}
                </option>
              ))}
            </select>

            
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FACTURAS */}
        <div className="rounded-xl border border-[#444242] bg-[#2e2c2d] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#fffef9]">Facturas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#fffef9]/70">
                <tr className="border-b border-[#444242]">
                  <th className="text-left py-2 pr-2">Factura</th>
                  <th className="text-left py-2 pr-2">Periodo</th>
                  <th className="text-left py-2 pr-2">Vence</th>
                  <th className="text-left py-2 pr-2">Estado</th>
                  <th className="text-right py-2 pr-2">Total</th>
                  <th className="text-right py-2">Saldo</th>
                </tr>
              </thead>
              <tbody className="text-[#fffef9]/85">
                {selectedOrgId === "" ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[#fffef9]/50">
                      Seleccioná una organización para ver facturas.
                    </td>
                  </tr>
                ) : facturas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[#fffef9]/50">
                      Sin facturas para esta organización.
                    </td>
                  </tr>
                ) : (
                  facturas.map((f) => (
                    <tr key={f.id_factura} className="border-b border-[#3a3738]">
                      <td className="py-2 pr-2">#{f.id_factura}</td>
                      <td className="py-2 pr-2">{f.periodo ?? "—"}</td>
                      <td className="py-2 pr-2">{f.fecha_vencimiento ?? "—"}</td>
                      <td className="py-2 pr-2">{f.estado_factura ?? "—"}</td>
                      <td className="py-2 pr-2 text-right">
                        ₡{Number(f.total ?? 0).toLocaleString("es-CR")}
                      </td>
                      <td className="py-2 text-right">
                        ₡{Number(f.saldo ?? 0).toLocaleString("es-CR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGOS */}
        <div className="rounded-xl border border-[#444242] bg-[#2e2c2d] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#fffef9]">Pagos</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#fffef9]/70">
                <tr className="border-b border-[#444242]">
                  <th className="text-left py-2 pr-2">Pago</th>
                  <th className="text-left py-2 pr-2">Factura</th>
                  <th className="text-left py-2 pr-2">Fecha</th>
                  <th className="text-left py-2 pr-2">Método</th>
                  <th className="text-left py-2 pr-2">Referencia</th>
                  <th className="text-left py-2 pr-2">Estado</th>
                  <th className="text-right py-2">Monto</th>
                </tr>
              </thead>
              <tbody className="text-[#fffef9]/85">
                {selectedOrgId === "" ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-[#fffef9]/50">
                      Seleccioná una organización para ver pagos.
                    </td>
                  </tr>
                ) : pagos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-[#fffef9]/50">
                      Sin pagos registrados para estas facturas.
                    </td>
                  </tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.id_pago} className="border-b border-[#3a3738]">
                      <td className="py-2 pr-2">#{p.id_pago}</td>
                      <td className="py-2 pr-2">#{p.id_factura}</td>
                      <td className="py-2 pr-2">
                        {p.fecha_pago ? new Date(p.fecha_pago).toLocaleString("es-CR") : "—"}
                      </td>
                      <td className="py-2 pr-2">{p.metodo ?? "—"}</td>
                      <td className="py-2 pr-2">{p.referencia ?? "—"}</td>
                      <td className="py-2 pr-2">{p.estado_pago ?? "—"}</td>
                      <td className="py-2 text-right">
                        ₡{Number(p.monto ?? 0).toLocaleString("es-CR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </Shell>
  );
}
