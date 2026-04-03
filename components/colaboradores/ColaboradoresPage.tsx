"use client";

import { useEffect, useState } from "react";
import { Edit2, Trash2, Heart, X, Save } from "react-feather";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = [
  { bg: "#ee2346", text: "#fff" },
  { bg: "#6cbe45", text: "#fff" },
  { bg: "#3b82f6", text: "#fff" },
  { bg: "#8b5cf6", text: "#fff" },
  { bg: "#f97316", text: "#fff" },
  { bg: "#14b8a6", text: "#fff" },
  { bg: "#ec4899", text: "#fff" },
  { bg: "#6366f1", text: "#fff" },
  { bg: "#eab308", text: "#fff" },
  { bg: "#0ea5e9", text: "#fff" },
];

function avatarColor(nombre: string) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
  "Estable":   { strip: "bg-[#6cbe45]", badge: "bg-[#6cbe45]/15 text-[#6cbe45]",  glow: "hover:border-[#6cbe45]/40"  },
  "Atento":    { strip: "bg-[#facc15]", badge: "bg-[#facc15]/20 text-yellow-600 dark:text-[#facc15]", glow: "hover:border-[#facc15]/40" },
  "En riesgo": { strip: "bg-[#ee2346]", badge: "bg-[#ee2346]/15 text-[#ee2346]",  glow: "hover:border-[#ee2346]/40"  },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--ss-text)]">Equipo</h1>
        <p className="text-xs text-[var(--ss-text3)]">{colaboradores.length} colaboradores</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {colaboradores.map((c) => {
          const mental = mentalConfig[c.mentalState];
          const completionPct = c.totalTareas > 0
            ? Math.round((c.tareasAprobadas / c.totalTareas) * 100)
            : 0;

          const av = avatarColor(c.nombre);
          return (
            <div
              key={c.id}
              onClick={() => router.push("/colaboradores/" + c.id)}
              className={"cursor-pointer rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 " + mental.glow}
            >
              {/* top accent strip */}
              <div className={"h-1 w-full " + mental.strip} />

              {/* HEADER */}
              <div className="p-5 flex gap-4 items-start">
                <div className="relative shrink-0">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold select-none"
                    style={{ backgroundColor: av.bg, color: av.text }}
                  >
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className={
                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--ss-surface)] " +
                    (c.estadoCuenta === "Activo" ? "bg-[#6cbe45]" : "bg-[var(--ss-text3)]")
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--ss-text)] truncate">{c.nombre}</div>
                  <div className="text-xs text-[var(--ss-text3)] truncate mt-0.5">{c.email}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={
                      "px-2 py-0.5 text-xs rounded-full font-medium " +
                      (c.estadoCuenta === "Activo"
                        ? "bg-[#6cbe45]/15 text-[#6cbe45]"
                        : "bg-[#ee2346]/15 text-[#ee2346]")
                    }>
                      {c.estadoCuenta}
                    </span>
                    <span className={"px-2 py-0.5 text-xs rounded-full font-medium flex items-center gap-1 " + mental.badge}>
                      <Heart size={10} />
                      {c.mentalState}
                    </span>
                  </div>
                </div>
              </div>

              {/* COMPLETION BAR */}
              <div className="px-5 pb-3">
                <div className="flex justify-between text-xs text-[var(--ss-text3)] mb-1.5">
                  <span>Completado</span>
                  <span className="font-medium text-[var(--ss-text2)]">{completionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--ss-overlay)]">
                  <div className="h-1.5 rounded-full bg-[#6cbe45] transition-all" style={{ width: completionPct + "%" }} />
                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-4 gap-2 px-5 pb-4">
                <MiniStat label="Tareas" value={c.totalTareas} />
                <MiniStat label="Aprobadas" value={c.tareasAprobadas} accent="green" />
                <MiniStat label="Pendientes" value={c.tareasPendientes} accent="yellow" />
                <div
                  className="rounded-xl p-2.5 text-center relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #ee2346 0%, #b91c1c 60%, #7f1d1d 100%)" }}
                >
                  <span className="absolute -right-1 -top-1 text-2xl opacity-20 select-none rotate-12 pointer-events-none">🌶</span>
                  <div className="text-lg font-bold text-white relative z-10">{c.chilliPoints}</div>
                  <div className="text-[10px] text-white/60 relative z-10">Chilli</div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={(e) => abrirEditar(e, c)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-3 py-2 text-xs font-medium text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] hover:text-[var(--ss-text)] transition-colors"
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  onClick={(e) => desactivar(e, c)}
                  disabled={desactivando === c.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#ee2346]/30 bg-[#ee2346]/10 px-3 py-2 text-xs font-medium text-[#ee2346] hover:bg-[#ee2346]/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {desactivando === c.id ? "Desactivando…" : "Desactivar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setEditando(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm select-none"
                  style={{ backgroundColor: avatarColor(editando.nombre).bg, color: avatarColor(editando.nombre).text }}
                >
                  {editando.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--ss-text)]">{editando.nombre}</p>
                  <p className="text-xs text-[var(--ss-text3)]">Editar colaborador</p>
                </div>
              </div>
              <button
                onClick={() => setEditando(null)}
                className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition-colors p-1 rounded-lg hover:bg-[var(--ss-overlay)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--ss-text2)] mb-1.5">Nombre</label>
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-xl border border-[var(--ss-border)] bg-[var(--ss-input)] px-3 py-2.5 text-sm text-[var(--ss-text)] placeholder:text-[var(--ss-text3)] focus:outline-none focus:border-[#ee2346]/60 focus:ring-2 focus:ring-[#ee2346]/10 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ss-text2)] mb-1.5">Correo</label>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-[var(--ss-border)] bg-[var(--ss-input)] px-3 py-2.5 text-sm text-[var(--ss-text)] placeholder:text-[var(--ss-text3)] focus:outline-none focus:border-[#ee2346]/60 focus:ring-2 focus:ring-[#ee2346]/10 transition-colors"
                />
              </div>
            </div>

            {/* modal actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] px-4 py-2.5 text-sm font-medium text-[var(--ss-text2)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-overlay)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={saving || !editNombre.trim() || !editEmail.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee2346] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#cc1f3d] disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: "green" | "yellow" }) {
  const strip    = accent === "green" ? "bg-[#6cbe45]" : accent === "yellow" ? "bg-[#facc15]" : "bg-[var(--ss-text3)]";
  const valColor = accent === "green" ? "text-[#6cbe45]" : accent === "yellow" ? "text-yellow-500 dark:text-[#facc15]" : "text-[var(--ss-text)]";
  return (
    <div className="rounded-xl bg-[var(--ss-raised)] p-2.5 text-center relative overflow-hidden border border-[var(--ss-border)]">
      <div className={"absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl " + strip} />
      <div className={"text-lg font-bold " + valColor}>{value}</div>
      <div className="text-[10px] text-[var(--ss-text3)]">{label}</div>
    </div>
  );
}
