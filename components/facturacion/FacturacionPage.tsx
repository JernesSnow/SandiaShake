"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "react-feather";

type InvoiceStatus = "borrador" | "enviada" | "pagada" | "vencida" | "anulada";

export type Invoice = {
  id: string;
  numero: string;
  cliente: string;
  fechaEmision: string;   // yyyy-mm-dd
  fechaVencimiento: string;
  moneda: "CRC" | "USD";
  total: number;
  estado: InvoiceStatus;
  notas?: string;
};

const initialInvoices: Invoice[] = [
  {
    id: "f1",
    numero: "SCC-2025-001",
    cliente: "Café La Plaza",
    fechaEmision: "2025-02-01",
    fechaVencimiento: "2025-02-10",
    moneda: "CRC",
    total: 150000,
    estado: "pagada",
    notas: "Factura correspondiente a enero 2025 (redes sociales).",
  },
  {
    id: "f2",
    numero: "SCC-2025-002",
    cliente: "Hotel Las Olas",
    fechaEmision: "2025-02-03",
    fechaVencimiento: "2025-02-15",
    moneda: "USD",
    total: 650,
    estado: "enviada",
    notas: "Pendiente confirmación de pago.",
  },
  {
    id: "f3",
    numero: "SCC-2025-003",
    cliente: "Gimnasio PowerFit",
    fechaEmision: "2025-01-20",
    fechaVencimiento: "2025-01-30",
    moneda: "CRC",
    total: 180000,
    estado: "vencida",
    notas: "Contactar a contabilidad del cliente.",
  },
];

function formatCurrency(total: number, moneda: "CRC" | "USD") {
  const symbol = moneda === "CRC" ? "₡" : "$";
  return `${symbol} ${total.toLocaleString("es-CR")}`;
}

function statusBadge(estado: InvoiceStatus) {
  switch (estado) {
    case "pagada":
      return {
        label: "Pagada",
        classes: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40",
        icon: <CheckCircle size={13} />,
      };
    case "enviada":
      return {
        label: "Enviada",
        classes: "bg-sky-500/15 text-sky-300 border border-sky-400/40",
        icon: <Clock size={13} />,
      };
    case "vencida":
      return {
        label: "Vencida",
        classes: "bg-[#ee2346]/15 text-[#fecaca] border border-[#ee2346]/60",
        icon: <AlertTriangle size={13} />,
      };
    case "anulada":
      return {
        label: "Anulada",
        classes: "bg-zinc-700 text-zinc-300 border border-zinc-500",
        icon: <Trash2 size={13} />,
      };
    case "borrador":
    default:
      return {
        label: "Borrador",
        classes: "bg-zinc-700/60 text-zinc-200 border border-zinc-500/70",
        icon: <Edit2 size={13} />,
      };
  }
}

type StatusFilter = "todas" | InvoiceStatus;

export function FacturacionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");

  const [selectedId, setSelectedId] = useState<string | null>(
    initialInvoices[0]?.id ?? null
  );

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isNew, setIsNew] = useState(false);

  // --- FILTERED LIST ---
  const filteredInvoices = useMemo(() => {
    const s = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesText =
        !s ||
        inv.numero.toLowerCase().includes(s) ||
        inv.cliente.toLowerCase().includes(s);
      const matchesStatus =
        statusFilter === "todas" || inv.estado === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id === selectedId) ?? null,
    [invoices, selectedId]
  );

  // --- CRUD HANDLERS ---

  function openNewInvoice() {
    setIsNew(true);
    const today = new Date().toISOString().slice(0, 10);
    setEditingInvoice({
      id: "",
      numero: "",
      cliente: "",
      fechaEmision: today,
      fechaVencimiento: today,
      moneda: "CRC",
      total: 0,
      estado: "borrador",
      notas: "",
    });
  }

  function openEditInvoice(inv: Invoice) {
    setIsNew(false);
    setEditingInvoice({ ...inv });
  }

  function handleDeleteInvoice(id: string) {
    const remaining = invoices.filter((i) => i.id !== id);
    setInvoices(remaining);

    // update selected
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? null);
    }
    setEditingInvoice(null);
  }

  function handleSaveInvoice(input: Invoice) {
    if (isNew) {
      const id = `f${Date.now()}`;
      const newInvoice = { ...input, id };
      const updated = [newInvoice, ...invoices];
      setInvoices(updated);
      setSelectedId(id);
    } else {
      const updated = invoices.map((inv) =>
        inv.id === input.id ? { ...inv, ...input } : inv
      );
      setInvoices(updated);
      setSelectedId(input.id);
    }

    setEditingInvoice(null);
    setIsNew(false);
  }

  // --- RENDER ---

  return (
    <div className="flex flex-col gap-4 text-[#fffef9]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#fffef9]">
            Facturación
          </h1>
          <p className="text-xs text-[#fffef9]/60">
            Administra tus facturas de clientes Sandía con Chile.
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
              placeholder="Buscar por número o cliente..."
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
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="anulada">Anulada</option>
          </select>

          {/* New invoice */}
          <button
            type="button"
            onClick={openNewInvoice}
            className="
              inline-flex items-center gap-2 rounded-md
              bg-[#ee2346] text-[#fffef9] px-3 py-2
              text-xs font-medium shadow-sm hover:bg-[#d8203f]
              active:scale-[.98]
            "
          >
            <Plus size={14} />
            Nueva factura
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT: lista izquierda + detalle derecha */}
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
              Facturas
            </span>
            <span className="text-[11px] text-[#fffef9]/50">
              {filteredInvoices.length} registros
            </span>
          </div>

          <div className="divide-y divide-[#4a4748]/50 max-h-[60vh] overflow-y-auto">
            {filteredInvoices.length === 0 && (
              <div className="px-4 py-6 text-xs text-[#fffef9]/50">
                No hay facturas que coincidan con el filtro.
              </div>
            )}

            {filteredInvoices.map((inv) => {
              const isActive = inv.id === selectedId;
              const badge = statusBadge(inv.estado);
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => setSelectedId(inv.id)}
                  className={`
                    w-full text-left px-4 py-3 text-xs
                    flex items-start justify-between gap-3
                    hover:bg-[#4a4748]/40
                    ${isActive ? "bg-[#4a4748]/70" : ""}
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#fffef9]">
                      {inv.numero}
                    </span>
                    <span className="text-[11px] text-[#fffef9]/70">
                      {inv.cliente}
                    </span>
                    <span className="text-[11px] text-[#fffef9]/50 mt-1">
                      Emisión: {inv.fechaEmision} · Vence: {inv.fechaVencimiento}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-medium text-[#fffef9]">
                      {formatCurrency(inv.total, inv.moneda)}
                    </span>
                    <span
                      className={`
                        inline-flex items-center gap-1 rounded-full px-2 py-0.5
                        text-[10px] font-medium
                        ${badge.classes}
                      `}
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

        {/* RIGHT: Invoice detail / editor */}
        <div
          className="
            bg-[#333132] rounded-xl border border-[#4a4748]/50
            shadow-sm p-4 md:p-5
          "
        >
          {!selectedInvoice && !editingInvoice && (
            <div className="text-xs text-[#fffef9]/60">
              Selecciona una factura de la lista o crea una nueva.
            </div>
          )}

          {(selectedInvoice || editingInvoice) && (
            <InvoiceForm
              key={editingInvoice ? editingInvoice.id || "new" : selectedInvoice?.id}
              isNew={isNew}
              invoice={editingInvoice ?? (selectedInvoice as Invoice)}
              onSave={handleSaveInvoice}
              onDelete={handleDeleteInvoice}
              onEdit={openEditInvoice}
              onCancelEdit={() => {
                setEditingInvoice(null);
                setIsNew(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------
   InvoiceForm: ver / editar / crear
-------------------------------------------------- */

type InvoiceFormProps = {
  isNew: boolean;
  invoice: Invoice;
  onSave: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onEdit: (inv: Invoice) => void;
  onCancelEdit: () => void;
};

function InvoiceForm({
  isNew,
  invoice,
  onSave,
  onDelete,
  onEdit,
  onCancelEdit,
}: InvoiceFormProps) {
  const [form, setForm] = useState<Invoice>(invoice);
  const [editing, setEditing] = useState<boolean>(isNew);

  function updateField<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.numero.trim() || !form.cliente.trim()) {
      alert("El número de factura y el cliente son obligatorios.");
      return;
    }
    onSave(form);
    setEditing(false);
  }

  const badge = statusBadge(form.estado);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 text-xs text-[#fffef9]"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#fffef9]">
            {isNew ? "Nueva factura" : form.numero || "Factura sin número"}
          </h2>
          <p className="text-[11px] text-[#fffef9]/60">
            Gestiona los datos generales de la factura.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`
              inline-flex items-center gap-1 rounded-full px-2 py-0.5
              text-[10px] font-medium
              ${badge.classes}
            `}
          >
            {badge.icon}
            {badge.label}
          </span>

          {!isNew && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                onEdit(form);
              }}
              className="
                inline-flex items-center gap-1 px-2 py-1 rounded-md
                bg-[#4a4748] text-[11px] text-[#fffef9]
                border border-[#fffef9]/10 hover:bg-[#5b5859]
              "
            >
              <Edit2 size={12} />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Form fields */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">
            Número de factura *
          </label>
          <input
            type="text"
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.numero}
            onChange={(e) => updateField("numero", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">Cliente *</label>
          <input
            type="text"
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.cliente}
            onChange={(e) => updateField("cliente", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">
            Fecha de emisión
          </label>
          <input
            type="date"
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.fechaEmision}
            onChange={(e) => updateField("fechaEmision", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">
            Fecha de vencimiento
          </label>
          <input
            type="date"
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.fechaVencimiento}
            onChange={(e) => updateField("fechaVencimiento", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">Moneda</label>
          <select
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.moneda}
            onChange={(e) =>
              updateField("moneda", e.target.value as Invoice["moneda"])
            }
          >
            <option value="CRC">CRC (₡)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">Total</label>
          <input
            type="number"
            min={0}
            step={0.01}
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.total}
            onChange={(e) =>
              updateField("total", parseFloat(e.target.value) || 0)
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">Estado</label>
          <select
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.estado}
            onChange={(e) =>
              updateField("estado", e.target.value as InvoiceStatus)
            }
          >
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-[11px] text-[#fffef9]/70">
            Notas internas
          </label>
          <textarea
            disabled={!editing}
            className="
              rounded-md bg-[#4a4748] px-3 py-2 text-xs
              border border-[#fffef9]/15
              outline-none focus:ring-2 focus:ring-[#ee2346]/70
              min-h-[80px]
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            value={form.notas ?? ""}
            onChange={(e) => updateField("notas", e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[#fffef9]/10">
        {!isNew && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "¿Seguro que deseas eliminar esta factura? Esta acción no se puede deshacer."
                )
              ) {
                onDelete(form.id);
              }
            }}
            className="
              inline-flex items-center gap-1 text-[11px]
              text-[#ee2346] hover:text-[#f97373]
            "
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        )}

        <div className="ml-auto flex gap-2">
          {editing && (
            <button
              type="button"
              onClick={() => {
                onCancelEdit();
                setEditing(false);
              }}
              className="
                rounded-md border border-[#fffef9]/20 px-3 py-1.5 text-[11px]
                text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]
              "
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={!editing}
            className={`
              rounded-md px-3 py-1.5 text-[11px] font-semibold
              bg-[#ee2346] text-[#fffef9] hover:bg-[#d8203f]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}
