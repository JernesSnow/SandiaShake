"use client";

import { Shell } from "@/components/Shell";
import { useEffect, useMemo, useState } from "react";

type FacturaEstado = "PENDIENTE" | "PARCIAL" | "PAGADA" | "VENCIDA" | "ANULADA";

type FacturaCliente = {
  id_factura: number;
  periodo: string | null;
  total: number;
  saldo: number;
  estado_factura: FacturaEstado;
  fecha_vencimiento: string | null;
  created_at?: string | null;
  estado?: string | null; 
};

type PagoInfo = {
  sinpe?: string;
  cuenta?: string;
  titular?: string;
  emailComprobante?: string;
};

function formatCRC(n: number) {
  return `₡ ${Number(n || 0).toLocaleString("es-CR")}`;
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ estado }: { estado: FacturaEstado }) {
  const map: Record<FacturaEstado, { label: string; cls: string }> = {
    PAGADA: { label: "Pagada", cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40" },
    PARCIAL: { label: "Parcial", cls: "bg-sky-500/15 text-sky-300 border border-sky-400/40" },
    VENCIDA: { label: "Vencida", cls: "bg-[#ee2346]/15 text-[#fecaca] border border-[#ee2346]/60" },
    ANULADA: { label: "Anulada", cls: "bg-zinc-700 text-zinc-300 border border-zinc-500" },
    PENDIENTE: { label: "Pendiente", cls: "bg-zinc-700/60 text-zinc-200 border border-zinc-500/70" },
  };
  const b = map[estado] ?? map.PENDIENTE;

  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", b.cls)}>
      {b.label}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[#fffef9]/70 hover:text-white">✕</button>
        </div>

        <div className="p-5">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-[#4a4748]/30 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

type Filtro = "todas" | "pendientes" | "pagadas";

export default function MisFacturasPage() {
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoLoading, setPagoLoading] = useState(false);
  const [pagoInfo, setPagoInfo] = useState<PagoInfo | null>(null);

  async function fetchFacturas(nextFiltro: Filtro) {
    setLoading(true);
    try {
      const res = await fetch(`/api/mis-facturas?filtro=${nextFiltro}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando facturas");

      const data: FacturaCliente[] = json?.facturas ?? [];
      setFacturas(data);
      setSelectedId(data[0]?.id_factura ?? null);
    } catch (e) {
      console.error(e);
      setFacturas([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFacturas(filtro);
  }, [filtro]);

  const selected = useMemo(
    () => facturas.find((f) => f.id_factura === selectedId) ?? null,
    [facturas, selectedId]
  );

  async function openPago() {
    setPagoOpen(true);
    setPagoLoading(true);
    setPagoInfo(null);

    try {
      const res = await fetch("/api/pago-info", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar info de pago");
      setPagoInfo(json);
    } catch (e) {
      console.error(e);
      setPagoInfo(null);
    } finally {
      setPagoLoading(false);
    }
  }

  return (
    <Shell>
    <div className="min-h-screen bg-[#252324] text-[#fffef9] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Mis facturas</h1>
            <p className="text-xs text-[#fffef9]/60">
              Revisa tus cobros, vencimientos y estado de pago.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="rounded-md bg-[#3d3b3c] text-xs px-3 py-2 border border-[#4a4748]/40 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Filtro)}
            >
              <option value="todas">Todas</option>
              <option value="pendientes">Pendientes</option>
              <option value="pagadas">Pagadas</option>
            </select>

            <button
              type="button"
              onClick={openPago}
              className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] text-white px-3 py-2 text-xs font-medium hover:bg-[#5fa93d] active:scale-[.98]"
            >
              Cómo pagar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-4">
          {/* Left list */}
          <div className="bg-[#333132] rounded-xl border border-[#4a4748]/50 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[#4a4748]/60 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide uppercase text-[#fffef9]/70">
                Facturas
              </span>
              <span className="text-[11px] text-[#fffef9]/50">
                {loading ? "Cargando..." : `${facturas.length} registros`}
              </span>
            </div>

            <div className="divide-y divide-[#4a4748]/50 max-h-[65vh] overflow-y-auto">
              {!loading && facturas.length === 0 && (
                <div className="px-4 py-6 text-xs text-[#fffef9]/60">
                  No hay facturas para mostrar con este filtro.
                </div>
              )}

              {facturas.map((f) => {
                const active = f.id_factura === selectedId;
                return (
                  <button
                    key={f.id_factura}
                    type="button"
                    onClick={() => setSelectedId(f.id_factura)}
                    className={cx(
                      "w-full text-left px-4 py-3 text-xs flex items-start justify-between gap-3 hover:bg-[#4a4748]/40",
                      active && "bg-[#4a4748]/70"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        Factura #{f.id_factura}
                      </span>
                      <span className="text-[11px] text-[#fffef9]/70">
                        Periodo: {f.periodo ?? "—"}
                      </span>
                      <span className="text-[11px] text-[#fffef9]/50 mt-1">
                        Vence: {f.fecha_vencimiento ?? "—"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-medium">
                        Total: {formatCRC(f.total)}
                      </span>
                      <span className="text-[11px] text-[#fffef9]/70">
                        Saldo: {formatCRC(f.saldo)}
                      </span>
                      <Badge estado={f.estado_factura} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right detail */}
          <div className="bg-[#333132] rounded-xl border border-[#4a4748]/50 shadow-sm p-4 md:p-5">
            {!selected && (
              <div className="text-xs text-[#fffef9]/60">
                Selecciona una factura para ver el detalle.
              </div>
            )}

            {selected && (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Factura #{selected.id_factura}
                    </h2>
                    <p className="text-[11px] text-[#fffef9]/60">
                      Periodo: {selected.periodo ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge estado={selected.estado_factura} />
                    <button
                      type="button"
                      onClick={openPago}
                      className="rounded-md bg-[#4a4748] text-[#fffef9] px-3 py-2 text-xs font-medium hover:bg-[#5a5758] active:scale-[.98]"
                    >
                      Cómo pagar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 text-xs">
                  <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
                    <div className="text-[11px] text-[#fffef9]/60">Total</div>
                    <div className="text-sm font-semibold">{formatCRC(selected.total)}</div>
                  </div>

                  <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
                    <div className="text-[11px] text-[#fffef9]/60">Saldo</div>
                    <div className="text-sm font-semibold">{formatCRC(selected.saldo)}</div>
                  </div>

                  <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4 md:col-span-2">
                    <div className="text-[11px] text-[#fffef9]/60">Vencimiento</div>
                    <div className="text-sm font-semibold">{selected.fecha_vencimiento ?? "—"}</div>
                  </div>

                  <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4 md:col-span-2">
                    <div className="text-[11px] text-[#fffef9]/60">Fecha de emisión</div>
                    <div className="text-sm font-semibold">
                      {selected.created_at ? String(selected.created_at).slice(0, 10) : "—"}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#fffef9]/60">
                  Si tu factura está pendiente, podés pagar usando SINPE o transferencia y enviar el comprobante.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {pagoOpen && (
        <Modal
          title="Cómo pagar"
          onClose={() => setPagoOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setPagoOpen(false)}
              className="rounded-md bg-[#4a4748] px-3 py-2 text-sm text-[#fffef9]/90 hover:bg-[#5a5758]"
            >
              Cerrar
            </button>
          }
        >
          {pagoLoading && <p className="text-sm text-[#fffef9]/70">Cargando…</p>}

          {!pagoLoading && !pagoInfo && (
            <p className="text-sm text-[#fffef9]/70">
              No se pudo cargar la información de pago.
            </p>
          )}

          {!pagoLoading && pagoInfo && (
            <div className="text-sm text-[#fffef9] space-y-2">
              <p className="text-[#fffef9]/70">
                Podés pagar con cualquiera de estos métodos. Luego enviá el comprobante.
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>SINPE: <b>{pagoInfo.sinpe ?? "No disponible"}</b></li>
                <li>Transferencia: <b>{pagoInfo.cuenta ?? "No disponible"}</b></li>
                <li>Titular: <b>{pagoInfo.titular ?? "No disponible"}</b></li>
                <li>Enviar comprobante a: <b>{pagoInfo.emailComprobante ?? "No disponible"}</b></li>
              </ul>
            </div>
          )}
        </Modal>
      )}
    </div>
    </Shell>
  );
}