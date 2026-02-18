"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, AlertTriangle, Clock, X } from "react-feather";

type FacturaEstado =
  | "PENDIENTE"
  | "PARCIAL"
  | "PAGADA"
  | "VENCIDA"
  | "ANULADA";

type MetodoPago = "SINPE" | "TRANSFERENCIA" | "OTRO";

type OrgOption = {
  id_organizacion: number;
  nombre: string;
};

type DbFactura = {
  id_factura: number;
  id_organizacion: number;
  organizacion_nombre: string;
  periodo: string;
  total: number;
  saldo: number;
  estado_factura: FacturaEstado;
  fecha_vencimiento: string | null;
};

function formatCRC(n: number) {
  return `₡ ${Number(n || 0).toLocaleString("es-CR")}`;
}

function badgeEstado(estado: FacturaEstado) {
  switch (estado) {
    case "PAGADA":
      return {
        label: "Pagada",
        classes:
          "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40",
        icon: <CheckCircle size={13} />,
      };
    case "PARCIAL":
      return {
        label: "Parcial",
        classes: "bg-sky-500/15 text-sky-300 border border-sky-400/40",
        icon: <Clock size={13} />,
      };
    case "VENCIDA":
      return {
        label: "Vencida",
        classes: "bg-[#ee2346]/15 text-[#fecaca] border border-[#ee2346]/60",
        icon: <AlertTriangle size={13} />,
      };
    case "ANULADA":
      return {
        label: "Anulada",
        classes: "bg-zinc-700 text-zinc-300 border border-zinc-500",
        icon: <X size={13} />,
      };
    case "PENDIENTE":
    default:
      return {
        label: "Pendiente",
        classes: "bg-zinc-700/60 text-zinc-200 border border-zinc-500/70",
        icon: <Clock size={13} />,
      };
  }
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#fffef9]/60 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#fffef9]/70 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
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

type StatusFilter = "todas" | FacturaEstado;

export function FacturacionPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<DbFactura[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payFacturaId, setPayFacturaId] = useState<number | "">("");
  const [payMonto, setPayMonto] = useState<string>("");
  const [payMetodo, setPayMetodo] = useState<MetodoPago>("SINPE");
  const [payReferencia, setPayReferencia] = useState<string>("");
  const [savingPay, setSavingPay] = useState(false);

  const [organizaciones, setOrganizaciones] = useState<OrgOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState<number | "">("");
  const [createPeriodo, setCreatePeriodo] = useState("");
  const [createTotal, setCreateTotal] = useState("");
  const [createVencimiento, setCreateVencimiento] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editPeriodo, setEditPeriodo] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editVencimiento, setEditVencimiento] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);

  
const [sendingEmail, setSendingEmail] = useState(false);

async function enviarNotificacion(tipo: "recordatorio" | "pago") {
  if (!selectedInvoice) return;

  setSendingEmail(true);
  try {
    const res = await fetch("/api/admin/facturacion/notificacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_factura: selectedInvoice.id_factura,
        tipo,
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "No se pudo enviar el correo");

    alert(`Correo enviado a: ${json?.to || "cliente"}`);
  } catch (e: any) {
    console.error(e);
    alert(e?.message ?? "Error enviando correo");
  } finally {
    setSendingEmail(false);
  }
}

  async function fetchFacturas() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/facturas?scope=pendientes", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando facturas");

      const data: DbFactura[] = json?.facturas ?? [];
      setInvoices(data);
      setSelectedId(data[0]?.id_factura ?? null);
    } catch (e: any) {
      console.error(e);
      setInvoices([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFacturas();
  }, []);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/admin/organizaciones");
        const json = await res.json();
        if (res.ok && json?.data) {
          setOrganizaciones(
            (json.data as any[])
              .filter((o) => o.estado === "ACTIVO")
              .map((o) => ({ id_organizacion: o.id_organizacion, nombre: o.nombre }))
          );
        }
      } catch {
        /* silently ignore – dropdown will be empty */
      }
    }
    fetchOrgs();
  }, []);

  function openCreateModal() {
    setCreateOrgId("");
    setCreatePeriodo("");
    setCreateTotal("");
    setCreateVencimiento("");
    setCreateOpen(true);
  }

  async function submitCreate() {
    if (!createOrgId) {
      alert("Selecciona una organización.");
      return;
    }
    if (!createPeriodo.trim()) {
      alert("Ingresa el periodo.");
      return;
    }
    const total = Number(createTotal);
    if (!Number.isFinite(total) || total <= 0) {
      alert("El total debe ser un número positivo.");
      return;
    }

    setSavingCreate(true);
    try {
      const body: Record<string, unknown> = {
        id_organizacion: Number(createOrgId),
        periodo: createPeriodo.trim(),
        total,
      };
      if (createVencimiento) {
        body.fecha_vencimiento = createVencimiento;
      }

      const res = await fetch("/api/admin/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear la factura");

      setCreateOpen(false);
      await fetchFacturas();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error creando factura");
    } finally {
      setSavingCreate(false);
    }
  }

  function openEditModal() {
    if (!selectedInvoice) return;
    setEditPeriodo(selectedInvoice.periodo);
    setEditTotal(String(selectedInvoice.total));
    setEditVencimiento(selectedInvoice.fecha_vencimiento ?? "");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!selectedInvoice) return;

    const total = Number(editTotal);
    if (!Number.isFinite(total) || total <= 0) {
      alert("El total debe ser un número positivo.");
      return;
    }
    if (!editPeriodo.trim()) {
      alert("Ingresa el periodo.");
      return;
    }

    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        id_factura: selectedInvoice.id_factura,
        periodo: editPeriodo.trim(),
        total,
      };
      body.fecha_vencimiento = editVencimiento || null;

      const res = await fetch("/api/admin/facturas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo editar la factura");

      setEditOpen(false);
      await fetchFacturas();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error editando factura");
    } finally {
      setSavingEdit(false);
    }
  }

  async function submitDelete() {
    if (!selectedInvoice) return;

    setSavingDelete(true);
    try {
      const res = await fetch("/api/admin/facturas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_factura: selectedInvoice.id_factura }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo eliminar la factura");

      setDeleteOpen(false);
      setSelectedId(null);
      await fetchFacturas();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error eliminando factura");
    } finally {
      setSavingDelete(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const s = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      const orgName = String(inv.organizacion_nombre ?? "").toLowerCase();
      const periodo = String(inv.periodo ?? "").toLowerCase();
      const idStr = String(inv.id_factura ?? "");

      const matchesText =
        !s || orgName.includes(s) || periodo.includes(s) || idStr.includes(s);

      const matchesStatus =
        statusFilter === "todas" || inv.estado_factura === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id_factura === selectedId) ?? null,
    [invoices, selectedId]
  );

  function openPagoModal() {
    setPayFacturaId(selectedInvoice?.id_factura ?? "");
    setPayMonto("");
    setPayMetodo("SINPE");
    setPayReferencia("");
    setPayOpen(true);
  }

  async function submitPago() {
    if (!payFacturaId) {
      alert("Selecciona una factura.");
      return;
    }
    const monto = Number(payMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Monto inválido.");
      return;
    }

    setSavingPay(true);
    try {
      const res = await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_factura: Number(payFacturaId),
          monto,
          metodo: payMetodo,
          referencia: payReferencia?.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo registrar el pago");

      setPayOpen(false);
      await fetchFacturas();
      //prueba
await enviarNotificacion("pago");
      //fin prueba
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error registrando pago");
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-[#fffef9]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#fffef9]">Facturación</h1>
          <p className="text-xs text-[#fffef9]/60">
            Aquí verás facturas pendientes y podrás registrar pagos (SINPE o transferencia).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente/periodo/id..."
              className="
                w-full sm:w-72 rounded-md bg-[#3d3b3c] text-xs
                pl-7 pr-3 py-2
                border border-[#4a4748]/40
                outline-none focus:ring-2 focus:ring-[#ee2346]/70
              "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="
              rounded-md bg-[#3d3b3c] text-xs
              px-3 py-2 border border-[#4a4748]/40
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
            "
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="todas">Todas</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="VENCIDA">Vencida</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </select>

          {/* Nueva factura */}
          <button
            type="button"
            onClick={openCreateModal}
            className="
              inline-flex items-center gap-2 rounded-md
              bg-[#6cbe45] text-white px-3 py-2
              text-xs font-medium shadow-sm hover:bg-[#5fa93d]
              active:scale-[.98]
            "
          >
            Nueva factura
          </button>

          {/* Registrar pago  */}
          <button
            type="button"
            onClick={openPagoModal}
            disabled={!selectedInvoice}
            className="
              inline-flex items-center gap-2 rounded-md
              bg-[#ee2346] text-[#fffef9] px-3 py-2
              text-xs font-medium shadow-sm hover:bg-[#d8203f]
              active:scale-[.98]
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            Registrar pago
          </button>
        </div>
      </div>
      <div
        className="
          grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]
          gap-4
        "
      >
        {/* LEFT: Invoice list */}
        <div
          className="
            bg-[#333132] rounded-xl border border-[#4a4748]/50
            shadow-sm overflow-hidden flex flex-col
          "
        >
          <div className="px-4 py-3 border-b border-[#4a4748]/60 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase text-[#fffef9]/70">
              Facturas pendientes
            </span>
            <span className="text-[11px] text-[#fffef9]/50">
              {loading ? "Cargando..." : `${filteredInvoices.length} registros`}
            </span>
          </div>

          <div className="divide-y divide-[#4a4748]/50 max-h-[60vh] overflow-y-auto">
            {!loading && filteredInvoices.length === 0 && (
              <div className="px-4 py-6 text-xs text-[#fffef9]/60">
                No hay facturas pendientes de organizaciones.
              </div>
            )}

            {filteredInvoices.map((inv) => {
              const isActive = inv.id_factura === selectedId;
              const badge = badgeEstado(inv.estado_factura);

              return (
                <button
                  key={inv.id_factura}
                  type="button"
                  onClick={() => setSelectedId(inv.id_factura)}
                  className={cx(
                    "w-full text-left px-4 py-3 text-xs",
                    "flex items-start justify-between gap-3 hover:bg-[#4a4748]/40",
                    isActive && "bg-[#4a4748]/70"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#fffef9]">
                      {inv.organizacion_nombre}
                    </span>
                    <span className="text-[11px] text-[#fffef9]/70">
                      Periodo: {inv.periodo}
                    </span>
                    <span className="text-[11px] text-[#fffef9]/50 mt-1">
                      ID factura: {inv.id_factura}
                      {inv.fecha_vencimiento ? ` · Vence: ${inv.fecha_vencimiento}` : ""}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-medium text-[#fffef9]">
                      Total: {formatCRC(inv.total)}
                    </span>
                    <span className="text-[11px] text-[#fffef9]/70">
                      Saldo: {formatCRC(inv.saldo)}
                    </span>
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                        "text-[10px] font-medium",
                        badge.classes
                      )}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Detail */}
        <div
          className="
            bg-[#333132] rounded-xl border border-[#4a4748]/50
            shadow-sm p-4 md:p-5
          "
        >
          {!selectedInvoice && (
            <div className="text-xs text-[#fffef9]/60">
              Selecciona una factura de la lista para ver el detalle.
            </div>
          )}

          {selectedInvoice && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#fffef9]">
                    {selectedInvoice.organizacion_nombre}
                  </h2>
                  <p className="text-[11px] text-[#fffef9]/60">
                    Periodo {selectedInvoice.periodo} · Factura #{selectedInvoice.id_factura}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                      "text-[10px] font-medium",
                      badgeEstado(selectedInvoice.estado_factura).classes
                    )}
                  >
                    {badgeEstado(selectedInvoice.estado_factura).icon}
                    {badgeEstado(selectedInvoice.estado_factura).label}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openPagoModal}
                      className="
                        inline-flex items-center gap-2 rounded-md
                        bg-[#ee2346] text-[#fffef9] px-3 py-2
                        text-xs font-medium hover:bg-[#d8203f]
                        active:scale-[.98]
                      "
                    >
                      Registrar pago
                    </button>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="
                        inline-flex items-center gap-2 rounded-md
                        bg-[#4a4748] text-[#fffef9] px-3 py-2
                        text-xs font-medium hover:bg-[#5a5758]
                        active:scale-[.98]
                      "
                    >
                      Editar
                    </button>
                    {/*pureba boton */}
                    <button
  type="button"
  onClick={() => enviarNotificacion("recordatorio")}
  disabled={!selectedInvoice || sendingEmail}
  className="
    inline-flex items-center gap-2 rounded-md
    bg-[#4a4748] text-[#fffef9] px-3 py-2
    text-xs font-medium hover:bg-[#5a5758]
    active:scale-[.98]
    disabled:opacity-60 disabled:cursor-not-allowed
  "
>
  {sendingEmail ? "Enviando..." : "Enviar recordatorio"}
</button>



                    {/*fin prueba boton */}
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="
                        inline-flex items-center gap-2 rounded-md
                        border border-[#ee2346]/60 text-[#ee2346] px-3 py-2
                        text-xs font-medium hover:bg-[#ee2346]/10
                        active:scale-[.98]
                      "
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
                  <div className="text-[11px] text-[#fffef9]/60">Total</div>
                  <div className="text-sm font-semibold">{formatCRC(selectedInvoice.total)}</div>
                </div>

                <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4">
                  <div className="text-[11px] text-[#fffef9]/60">Saldo</div>
                  <div className="text-sm font-semibold">{formatCRC(selectedInvoice.saldo)}</div>
                </div>

                <div className="rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-4 md:col-span-2">
                  <div className="text-[11px] text-[#fffef9]/60">Vencimiento</div>
                  <div className="text-sm font-semibold">
                    {selectedInvoice.fecha_vencimiento ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registrar pago */}
      {payOpen && (
        <Modal
          title="Registrar pago"
          subtitle="Ingresa monto y método. Se guardará en la BD y actualizará el saldo."
          onClose={() => setPayOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPago}
                disabled={savingPay}
                className="rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingPay ? "Guardando..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Factura</label>
              <select
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={payFacturaId}
                onChange={(e) =>
                  setPayFacturaId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Selecciona una factura</option>
                {invoices.map((f) => (
                  <option key={f.id_factura} value={f.id_factura}>
                    #{f.id_factura} · {f.organizacion_nombre} · {f.periodo} · Saldo{" "}
                    {formatCRC(f.saldo)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Monto</label>
              <input
                type="number"
                min={1}
                step={1}
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={payMonto}
                onChange={(e) => setPayMonto(e.target.value)}
                placeholder="Ej: 15000"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Método</label>
              <select
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={payMetodo}
                onChange={(e) => setPayMetodo(e.target.value as MetodoPago)}
              >
                <option value="SINPE">SINPE</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">
                Referencia 
              </label>
              <input
                type="text"
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={payReferencia}
                onChange={(e) => setPayReferencia(e.target.value)}
                placeholder="Comprobante / número referencia"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Nueva factura */}
      {createOpen && (
        <Modal
          title="Nueva factura"
          subtitle="Crea una factura para una organización."
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={savingCreate}
                className="rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingCreate ? "Guardando..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Organización</label>
              <select
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={createOrgId}
                onChange={(e) =>
                  setCreateOrgId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Selecciona una organización</option>
                {organizaciones.map((o) => (
                  <option key={o.id_organizacion} value={o.id_organizacion}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Periodo</label>
              <input
                type="text"
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={createPeriodo}
                onChange={(e) => setCreatePeriodo(e.target.value)}
                placeholder="Ej: Febrero 2026"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Total (CRC)</label>
              <input
                type="number"
                min={1}
                step={1}
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={createTotal}
                onChange={(e) => setCreateTotal(e.target.value)}
                placeholder="Ej: 50000"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">
                Fecha vencimiento (opcional)
              </label>
              <input
                type="date"
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={createVencimiento}
                onChange={(e) => setCreateVencimiento(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Editar factura */}
      {editOpen && selectedInvoice && (
        <Modal
          title="Editar factura"
          subtitle={`Factura #${selectedInvoice.id_factura} · ${selectedInvoice.organizacion_nombre}`}
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={savingEdit}
                className="rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingEdit ? "Guardando..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Periodo</label>
              <input
                type="text"
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={editPeriodo}
                onChange={(e) => setEditPeriodo(e.target.value)}
                placeholder="Ej: Febrero 2026"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">Total (CRC)</label>
              <input
                type="number"
                min={1}
                step={1}
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
                placeholder="Ej: 50000"
              />
              {(() => {
                const paid = selectedInvoice.total - selectedInvoice.saldo;
                return paid > 0 ? (
                  <p className="text-[10px] text-[#fffef9]/50 mt-0.5">
                    Ya pagado: {formatCRC(paid)}. El total no puede ser menor a ese monto.
                  </p>
                ) : null;
              })()}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#fffef9]/70">
                Fecha vencimiento (opcional)
              </label>
              <input
                type="date"
                className="rounded-md bg-[#4a4748] px-3 py-2 text-xs border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                value={editVencimiento}
                onChange={(e) => setEditVencimiento(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmar eliminación */}
      {deleteOpen && selectedInvoice && (
        <Modal
          title="Eliminar factura"
          subtitle={`Factura #${selectedInvoice.id_factura} · ${selectedInvoice.organizacion_nombre}`}
          onClose={() => setDeleteOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm text-[#fffef9]/80 hover:text-white hover:bg-[#3a3738] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitDelete}
                disabled={savingDelete}
                className="rounded-md bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingDelete ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#fffef9]/80">
            ¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer fácilmente.
          </p>
          <div className="mt-3 rounded-lg bg-[#2b2b30] border border-[#4a4748]/40 p-3 text-xs text-[#fffef9]/70">
            <p>Periodo: {selectedInvoice.periodo}</p>
            <p>Total: {formatCRC(selectedInvoice.total)}</p>
            <p>Saldo: {formatCRC(selectedInvoice.saldo)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
