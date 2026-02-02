"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MorosoFactura = {
  id_factura: number;
  id_organizacion: number;
  periodo: string | null;
  total: number | null;
  saldo: number | null;
  estado_factura: string | null;
  fecha_vencimiento: string | null;
};

type MorosoItem = {
  id_organizacion: number;
  organizacion_nombre: string;
  organizacion_estado: string;
  dias_atraso: number;
  monto_pendiente: number;
  fecha_limite_vencida: string | null;
  facturas_count: number;
  cliente_contacto: { nombre: string; correo: string | null } | null;
  facturas: MorosoFactura[];
};

export default function MorosidadPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MorosoItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/facturacion/morosos?limit=200&offset=0", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!mounted) return;

        const list: MorosoItem[] = data?.items ?? [];
        setItems(list);

        if (list.length && selectedOrgId === null) {
          setSelectedOrgId(list[0].id_organizacion);
        }
      } catch {
        if (!mounted) return;
        setItems([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };

  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((x) => {
      const org = (x.organizacion_nombre ?? "").toLowerCase();
      const cli = (x.cliente_contacto?.nombre ?? "").toLowerCase();
      const mail = (x.cliente_contacto?.correo ?? "").toLowerCase();
      return org.includes(term) || cli.includes(term) || mail.includes(term);
    });
  }, [items, q]);

  const selected = useMemo(() => {
    return filtered.find((x) => x.id_organizacion === selectedOrgId) ?? null;
  }, [filtered, selectedOrgId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Morosidad</h1>
          <p className="text-sm text-[#fffef9]/60">
            Clientes con facturas vencidas y saldo pendiente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar organización / cliente / correo..."
              className="w-[320px] max-w-[60vw] rounded-md bg-[#2e2c2d] border border-[#444242] px-3 py-2 text-sm outline-none focus:border-[#ee2346]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Listado morosos */}
        <div className="lg:col-span-5">
          <div className="rounded-lg border border-[#444242] bg-[#2e2c2d] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#444242] flex items-center justify-between">
              <div className="text-sm font-semibold">Clientes morosos</div>
              <div className="text-xs text-[#fffef9]/60">
                {loading ? "Cargando..." : `${filtered.length} registros`}
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {!loading && filtered.length === 0 && (
                <div className="p-4 text-sm text-[#fffef9]/60">
                  No hay morosos con los filtros actuales.
                </div>
              )}

              {filtered.map((it) => {
                const active = it.id_organizacion === selectedOrgId;
                return (
                  <button
                    key={it.id_organizacion}
                    onClick={() => setSelectedOrgId(it.id_organizacion)}
                    className={[
                      "w-full text-left px-4 py-3 border-b border-[#444242]/60 hover:bg-[#343132] transition",
                      active ? "bg-[#3a3738]" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{it.organizacion_nombre}</div>
                        <div className="text-xs text-[#fffef9]/60 truncate">
                          {it.cliente_contacto?.nombre ?? "Cliente —"}{" "}
                          {it.cliente_contacto?.correo ? `· ${it.cliente_contacto.correo}` : ""}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs text-[#fffef9]/70">
                          {it.dias_atraso} días atraso
                        </div>
                        <div className="text-sm font-bold">
                          ₡ {Number(it.monto_pendiente || 0).toLocaleString("es-CR")}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[#fffef9]/60">
                      <span className="inline-flex rounded-full border border-[#444242] px-2 py-0.5">
                        {it.facturas_count} facturas
                      </span>
                      <span className="inline-flex rounded-full border border-[#444242] px-2 py-0.5">
                        Límite: {it.fecha_limite_vencida ?? "—"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalle derecha */}
        <div className="lg:col-span-7">
          <div className="rounded-lg border border-[#444242] bg-[#2e2c2d] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#444242] flex items-center justify-between">
              <div className="text-sm font-semibold">Detalle</div>

              {selected && (
                <Link
                  href={`/facturacion/historial?id_organizacion=${selected.id_organizacion}`}
                  className="rounded-md bg-[#ee2346] hover:bg-[#d81d3e] px-3 py-2 text-xs font-semibold transition"
                >
                  Ver historial de pagos
                </Link>
              )}
            </div>

            {!selected ? (
              <div className="p-4 text-sm text-[#fffef9]/60">
                Seleccioná una organización de la lista.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Cards resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md bg-[#262425] border border-[#444242] p-3">
                    <div className="text-xs text-[#fffef9]/60">Organización</div>
                    <div className="font-semibold truncate">{selected.organizacion_nombre}</div>
                  </div>

                  <div className="rounded-md bg-[#262425] border border-[#444242] p-3">
                    <div className="text-xs text-[#fffef9]/60">Atraso</div>
                    <div className="font-semibold">{selected.dias_atraso} días</div>
                  </div>

                  <div className="rounded-md bg-[#262425] border border-[#444242] p-3">
                    <div className="text-xs text-[#fffef9]/60">Monto pendiente</div>
                    <div className="font-semibold">
                      ₡ {Number(selected.monto_pendiente || 0).toLocaleString("es-CR")}
                    </div>
                  </div>
                </div>

                {/* Tabla facturas vencidas */}
                <div className="rounded-md border border-[#444242] overflow-hidden">
                  <div className="px-3 py-2 bg-[#262425] border-b border-[#444242] text-sm font-semibold">
                    Facturas vencidas / con saldo
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-[#fffef9]/60 bg-[#2b292a]">
                        <tr>
                          <th className="text-left px-3 py-2">Factura</th>
                          <th className="text-left px-3 py-2">Período</th>
                          <th className="text-left px-3 py-2">Vence</th>
                          <th className="text-left px-3 py-2">Estado</th>
                          <th className="text-right px-3 py-2">Total</th>
                          <th className="text-right px-3 py-2">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.facturas.map((f) => (
                          <tr key={f.id_factura} className="border-t border-[#444242]/60">
                            <td className="px-3 py-2">#{f.id_factura}</td>
                            <td className="px-3 py-2">{f.periodo ?? "—"}</td>
                            <td className="px-3 py-2">{f.fecha_vencimiento ?? "—"}</td>
                            <td className="px-3 py-2">{f.estado_factura ?? "—"}</td>
                            <td className="px-3 py-2 text-right">
                              ₡ {Number(f.total ?? 0).toLocaleString("es-CR")}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              ₡ {Number(f.saldo ?? 0).toLocaleString("es-CR")}
                            </td>
                          </tr>
                        ))}
                        {selected.facturas.length === 0 && (
                          <tr>
                            <td className="px-3 py-3 text-[#fffef9]/60" colSpan={6}>
                              No hay facturas en detalle.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Contacto */}
                <div className="text-xs text-[#fffef9]/60">
                  Contacto:{" "}
                  <span className="text-[#fffef9]">
                    {selected.cliente_contacto?.nombre ?? "—"}
                  </span>
                  {selected.cliente_contacto?.correo ? (
                    <>
                      {" "}
                      · <span className="text-[#fffef9]">{selected.cliente_contacto.correo}</span>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
