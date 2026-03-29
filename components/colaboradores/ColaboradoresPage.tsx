"use client";

import { useEffect, useState } from "react";
import { Edit2, Trash2, Heart, X, Save } from "react-feather";
import { useRouter } from "next/navigation";

type MentalState = "Estable" | "Atento" | "En riesgo";
type EstadoCuenta = "Activo" | "Suspendido";
type RolColaborador = "Admin" | "Ejecutivo de cuenta" | "Diseñador" | "Editor" | "Community Manager";

type Colaborador = {
  id: string;
  nombre: string;
  email: string;
  rol: RolColaborador;
  estadoCuenta: EstadoCuenta;
  mentalState: MentalState;
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  chilliPoints: number;
};

const mentalConfig: Record<MentalState, { strip: string; badge: string; glow: string }> = {
  "Estable":   { strip: "bg-[#6cbe45]", badge: "bg-[#6cbe45]/15 text-[#6cbe45]", glow: "hover:border-[#6cbe45]/40"  },
  "Atento":    { strip: "bg-[#facc15]", badge: "bg-[#facc15]/15 text-[#facc15]", glow: "hover:border-[#facc15]/40"  },
  "En riesgo": { strip: "bg-[#ee2346]", badge: "bg-[#ee2346]/15 text-[#ee2346]", glow: "hover:border-[#ee2346]/40"  },
};

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [desactivando, setDesactivando] = useState<string | null>(null);
  const router = useRouter();

  async function cargar() {
    const res = await fetch("/api/admin/colaboradores");
    if (!res.ok) return;
    const json = await res.json();
    if (!Array.isArray(json.colaboradores)) return;
    setColaboradores(
      json.colaboradores.map((u: any) => ({
        id: String(u.id_usuario),
        nombre: u.nombre,
        email: u.correo,
        rol: u.rol === "ADMIN" ? "Admin" : "Ejecutivo de cuenta",
        estadoCuenta: u.estado === "ACTIVO" ? "Activo" : "Suspendido",
        mentalState: "Estable",
        totalTareas: u.totalTareas ?? 0,
        tareasPendientes: u.tareasPendientes ?? 0,
        tareasAprobadas: u.tareasAprobadas ?? 0,
        chilliPoints: u.chilliPoints ?? 0,
      }))
    );
  }

  useEffect(() => { cargar(); }, []);

  function abrirEditar(e: React.MouseEvent, c: Colaborador) {
    e.stopPropagation();
    setEditando(c);
    setEditNombre(c.nombre);
    setEditEmail(c.email);
  }

  async function guardarEdicion() {
    if (!editando) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: Number(editando.id),
          nombre: editNombre.trim(),
          correo: editEmail.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "No se pudo guardar");
        return;
      }
      setEditando(null);
      await cargar();
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(e: React.MouseEvent, c: Colaborador) {
    e.stopPropagation();
    if (!confirm("¿Desactivar a " + c.nombre + "? Esta acción se puede revertir.")) return;
    setDesactivando(c.id);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: Number(c.id), estado: "INACTIVO" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "No se pudo desactivar");
        return;
      }
      await cargar();
    } finally {
      setDesactivando(null);
    }
  }

  return (
    <div className="space-y-6 text-[#fffef9]">
      <h1 className="text-xl font-semibold">Equipo</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {colaboradores.map((c) => {
          const mental = mentalConfig[c.mentalState];
          const completionPct = c.totalTareas > 0
            ? Math.round((c.tareasAprobadas / c.totalTareas) * 100)
            : 0;

          return (
            <div
              key={c.id}
              onClick={() => router.push("/colaboradores/" + c.id)}
              className={"cursor-pointer rounded-xl bg-[#2b2b30] border border-[#4a4748]/40 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 " + mental.glow}
            >
              <div className={"h-1 w-full " + mental.strip} />

              {/* HEADER */}
              <div className="p-5 flex gap-4 items-start">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#ee2346] to-[#7dd3fc] flex items-center justify-center text-lg font-bold">
                    {c.nombre.charAt(0)}
                  </div>
                  <div className={"absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#2b2b30] " + (c.estadoCuenta === "Activo" ? "bg-[#6cbe45]" : "bg-[#4a4748]")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.nombre}</div>
                  <div className="text-xs text-[#fffef9]/50 truncate">{c.email}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={"px-2 py-0.5 text-xs rounded-full " + (c.estadoCuenta === "Activo" ? "bg-[#6cbe45]/15 text-[#6cbe45]" : "bg-[#ee2346]/15 text-[#ee2346]")}>
                      {c.estadoCuenta}
                    </span>
                    <span className={"px-2 py-0.5 text-xs rounded-full flex items-center gap-1 " + mental.badge}>
                      <Heart size={10} />
                      {c.mentalState}
                    </span>
                  </div>
                </div>
              </div>

              {/* COMPLETION BAR */}
              <div className="px-5 pb-3">
                <div className="flex justify-between text-xs text-[#fffef9]/40 mb-1">
                  <span>Completado</span>
                  <span>{completionPct}%</span>
                </div>
                <div className="h-1 rounded-full bg-[#4a4748]/40">
                  <div className="h-1 rounded-full bg-[#6cbe45] transition-all" style={{ width: completionPct + "%" }} />
                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-4 gap-2 px-5 pb-5">
                <MiniStat label="Tareas" value={c.totalTareas} />
                <MiniStat label="Aprobadas" value={c.tareasAprobadas} accent="green" />
                <MiniStat label="Pendientes" value={c.tareasPendientes} accent="yellow" />
                <div
                  className="rounded-lg p-2.5 text-center relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #ee2346 0%, #b91c1c 60%, #7f1d1d 100%)" }}
                >
                  <span className="absolute -right-1 -top-1 text-2xl opacity-20 select-none rotate-12 pointer-events-none"></span>
                  <div className="text-lg font-bold text-white relative z-10">{c.chilliPoints}</div>
                  <div className="text-xs text-white/50 relative z-10">Chilli</div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={(e) => abrirEditar(e, c)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#4a4748]/40 bg-[#1f1f24] px-3 py-2 text-xs text-[#fffef9]/70 hover:bg-[#2b2b30] hover:text-[#fffef9] transition-colors"
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  onClick={(e) => desactivar(e, c)}
                  disabled={desactivando === c.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#ee2346]/30 bg-[#ee2346]/10 px-3 py-2 text-xs text-[#ee2346] hover:bg-[#ee2346]/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {desactivando === c.id ? "Desactivando..." : "Desactivar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setEditando(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#ee2346] to-[#7dd3fc] flex items-center justify-center font-bold text-sm">
                  {editando.nombre.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{editando.nombre}</p>
                  <p className="text-xs text-[#fffef9]/40">Editar colaborador</p>
                </div>
              </div>
              <button
                onClick={() => setEditando(null)}
                className="text-[#fffef9]/40 hover:text-[#fffef9] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#fffef9]/50 mb-1.5">Nombre</label>
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-lg border border-[#4a4748]/40 bg-[#1f1f24] px-3 py-2.5 text-sm text-[#fffef9] placeholder-[#fffef9]/30 focus:outline-none focus:border-[#ee2346]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#fffef9]/50 mb-1.5">Correo</label>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-lg border border-[#4a4748]/40 bg-[#1f1f24] px-3 py-2.5 text-sm text-[#fffef9] placeholder-[#fffef9]/30 focus:outline-none focus:border-[#ee2346]/60 transition-colors"
                />
              </div>
            </div>

            {/* modal actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 rounded-lg border border-[#4a4748]/40 bg-[#1f1f24] px-4 py-2.5 text-sm text-[#fffef9]/60 hover:text-[#fffef9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={saving || !editNombre.trim() || !editEmail.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ee2346] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#cc1f3d] disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: "green" | "yellow" }) {
  const strip = accent === "green" ? "bg-[#6cbe45]" : accent === "yellow" ? "bg-[#facc15]" : "bg-[#4a4748]";
  const valColor = accent === "green" ? "text-[#6cbe45]" : accent === "yellow" ? "text-[#facc15]" : "text-[#fffef9]";
  return (
    <div className="rounded-lg bg-[#1f1f24] p-2.5 text-center relative overflow-hidden">
      <div className={"absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg " + strip} />
      <div className={"text-lg font-bold " + valColor}>{value}</div>
      <div className="text-xs text-[#fffef9]/40">{label}</div>
    </div>
  );
}
