"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Star,
  ShoppingCart, ExternalLink, BookOpen, Clock, BarChart2, Tag,
} from "react-feather";
import clsx from "clsx";

type CourseLevel    = "Intro" | "Intermedio" | "Avanzado";
type CourseCategory = "Instagram" | "Ads" | "Contenido" | "Estrategia" | "Otro";

type Course = {
  id_curso:       number;
  titulo:         string;
  subtitulo:      string | null;
  descripcion:    string | null;
  precio:         number;
  image_id:       string;
  chat_url:       string;
  duracion_label: string | null;
  nivel:          CourseLevel | null;
  categoria:      CourseCategory | null;
  featured:       boolean;
  visible?:       boolean;
};

type UserRole = "ADMIN" | "COLABORADOR" | "CLIENTE" | null;

const COURSE_IMG = (id: string) => `/${id}.png`;
const FALLBACK_IMG = "/mock-logo-sandia-con-chole.png";

function formatPrice(precio: number) {
  if (!precio) return null;
  return `₡${precio.toLocaleString("es-CR")}`;
}

const LEVEL_COLORS: Record<string, string> = {
  Intro:       "bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400",
  Intermedio:  "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
  Avanzado:    "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
};

/* ───────────────────────────────────────────────
   INPUT / SELECT primitives
─────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none placeholder:text-[var(--ss-text3)] " +
  "focus:border-[#6cbe45]/60 focus:ring-2 focus:ring-[#6cbe45]/20 transition";

const labelCls = "block text-xs font-medium text-[var(--ss-text2)] mb-1.5";

/* ───────────────────────────────────────────────
   MODAL SHELL
─────────────────────────────────────────────── */
function Modal({
  title, subtitle, onClose, children, footer,
}: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto
                      bg-[var(--ss-surface)] border border-[var(--ss-border-md)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--ss-border)] flex items-start justify-between gap-4 sticky top-0 bg-[var(--ss-raised)] rounded-t-2xl sm:rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-[var(--ss-text)]">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--ss-text2)] mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-[var(--ss-border)] bg-[var(--ss-raised)] rounded-b-2xl">
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   ADMIN CRUD MODAL
─────────────────────────────────────────────── */
type CourseFormData = Omit<Course, "id_curso"> & { id_curso?: number };

function CourseModal({
  isNew, course, onClose, onSave, onDelete, saving,
}: {
  isNew: boolean; course: CourseFormData; onClose: () => void;
  onSave: (c: CourseFormData) => void; onDelete: (id: number) => void; saving: boolean;
}) {
  const [form, setForm] = useState<CourseFormData>(course);
  function set<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return alert("El curso debe tener un título.");
    if (!form.chat_url.trim()) return alert("Debes colocar el link de WhatsApp.");
    onSave(form);
  }

  return (
    <Modal
      title={isNew ? "Nuevo curso" : "Editar curso"}
      subtitle="Configura el catálogo visible para clientes."
      onClose={onClose}
      footer={
        <>
          {!isNew && form.id_curso && (
            <button type="button" onClick={() => onDelete(form.id_curso!)} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ee2346]/40 px-4 py-2 text-xs font-semibold text-[#ee2346] hover:bg-[#ee2346]/10 disabled:opacity-50 transition">
              <Trash2 size={13} /> Eliminar
            </button>
          )}
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-xl border border-[var(--ss-border-md)] px-4 py-2 text-xs font-medium text-[var(--ss-text2)] hover:bg-[var(--ss-raised)] disabled:opacity-50 transition">
            Cancelar
          </button>
          <button type="submit" form="course-form" disabled={saving}
            className="rounded-xl bg-[#ee2346] text-white px-4 py-2 text-xs font-semibold hover:bg-[#d8203f] disabled:opacity-50 transition">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>Título *</label>
            <input type="text" className={inputCls} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Subtítulo</label>
            <input type="text" className={inputCls} value={form.subtitulo ?? ""} onChange={(e) => set("subtitulo", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Descripción</label>
            <textarea className={inputCls + " min-h-[90px] resize-none"} value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Link WhatsApp (wa.me...) *</label>
            <input type="url" className={inputCls} value={form.chat_url} onChange={(e) => set("chat_url", e.target.value)} placeholder="https://wa.me/506XXXXXXXX?text=..." />
          </div>
          <div>
            <label className={labelCls}>Precio (₡)</label>
            <input type="number" min={0} className={inputCls} value={form.precio} onChange={(e) => set("precio", Number(e.target.value))} placeholder="35000" />
          </div>
          <div>
            <label className={labelCls}>Duración</label>
            <input type="text" className={inputCls} value={form.duracion_label ?? ""} onChange={(e) => set("duracion_label", e.target.value)} placeholder="90 min" />
          </div>
          <div>
            <label className={labelCls}>Nivel</label>
            <select className={inputCls} value={form.nivel ?? ""} onChange={(e) => set("nivel", (e.target.value as CourseLevel) || null)}>
              <option value="">—</option>
              <option value="Intro">Intro</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select className={inputCls} value={form.categoria ?? ""} onChange={(e) => set("categoria", (e.target.value as CourseCategory) || null)}>
              <option value="">—</option>
              <option value="Instagram">Instagram</option>
              <option value="Contenido">Contenido</option>
              <option value="Ads">Ads</option>
              <option value="Estrategia">Estrategia</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Imagen (1, 2 o 3)</label>
            <select className={inputCls} value={form.image_id} onChange={(e) => set("image_id", e.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 justify-end">
            <label className="flex items-center gap-2.5 text-xs text-[var(--ss-text2)] cursor-pointer select-none">
              <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)}
                className="w-4 h-4 rounded border-[var(--ss-border-md)] accent-[#ee2346]" />
              Marcar como destacado
            </label>
            <label className="flex items-center gap-2.5 text-xs text-[var(--ss-text2)] cursor-pointer select-none">
              <input type="checkbox" checked={form.visible !== false} onChange={(e) => set("visible", e.target.checked)}
                className="w-4 h-4 rounded border-[var(--ss-border-md)] accent-[#6cbe45]" />
              Visible para clientes
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────────────────────────
   PURCHASE MODAL — step 1
─────────────────────────────────────────────── */
function PurchaseModal({ course, onClose, onNext, loading = false }: {
  course: Course; onClose: () => void; onNext: () => void; loading?: boolean;
}) {
  return (
    <Modal title={course.titulo} subtitle={course.subtitulo ?? undefined} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-[var(--ss-border-md)] px-4 py-2 text-xs font-medium text-[var(--ss-text2)] hover:bg-[var(--ss-raised)] transition">
            Cancelar
          </button>
          <button type="button" onClick={onNext} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition">
            <ShoppingCart size={14} />
            {loading ? "Procesando…" : "Proceder al pago"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border border-[var(--ss-border)] aspect-video bg-[var(--ss-raised)]">
          <img src={COURSE_IMG(course.image_id)} alt={course.titulo} className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }} />
        </div>
        {course.descripcion && (
          <p className="text-sm text-[var(--ss-text2)] leading-relaxed">{course.descripcion}</p>
        )}
        <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] divide-y divide-[var(--ss-border)]">
          {course.precio > 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--ss-text2)]">Precio</span>
              <span className="font-semibold text-[var(--ss-text)]">{formatPrice(course.precio)}</span>
            </div>
          )}
          {course.duracion_label && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--ss-text2)]">Duración</span>
              <span className="font-semibold text-[var(--ss-text)]">{course.duracion_label}</span>
            </div>
          )}
          {course.nivel && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--ss-text2)]">Nivel</span>
              <span className="font-semibold text-[var(--ss-text)]">{course.nivel}</span>
            </div>
          )}
          {course.categoria && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--ss-text2)]">Categoría</span>
              <span className="font-semibold text-[var(--ss-text)]">{course.categoria}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────────────────────────────
   PAYMENT MODAL — OnvoPay step 2
─────────────────────────────────────────────── */
type PaymentInfo = {
  paymentIntentId: string;
  curso: Pick<Course, "titulo" | "chat_url" | "precio" | "duracion_label" | "nivel" | "categoria">;
};

function OnvoPayModal({ paymentInfo, onClose, onPaid }: {
  paymentInfo: PaymentInfo; onClose: () => void; onPaid: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function loadSdk(): Promise<void> {
      return new Promise((resolve, reject) => {
        const SCRIPT_SRC = "https://sdk.onvopay.com/sdk.js";
        if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          if ((window as any).onvo) { resolve(); return; }
        }
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar el SDK de OnvoPay."));
        document.head.appendChild(script);
      });
    }
    async function mount() {
      try {
        await loadSdk();
        if (cancelled) return;
        const onvo = (window as any).onvo;
        if (!onvo) throw new Error("SDK de OnvoPay no disponible.");
        if (!cancelled) setLoading(false);
        onvo.pay({
          publicKey: process.env.NEXT_PUBLIC_ONVOPAY_PUBLIC_KEY!,
          paymentIntentId: paymentInfo.paymentIntentId,
          paymentType: "one_time",
          locale: "es",
          onSuccess: (data: any) => {
            if (cancelled) return;
            if (data?.status === "succeeded") onPaid();
            else if (data?.status !== "requires_action")
              setError("El pago fue declinado. Por favor intentá con otro método de pago.");
          },
          onError: (data: any) => { if (!cancelled) setError(data?.message ?? "Error al procesar el pago."); },
        }).render("#onvo-pay-container");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "No se pudo cargar la pasarela de pago.");
      }
    }
    mount();
    return () => { cancelled = true; };
  }, [paymentInfo, onPaid]);

  return (
    <Modal title="Pago del curso" subtitle={paymentInfo.curso.titulo} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--ss-text2)]">{paymentInfo.curso.titulo}</span>
          <span className="text-sm font-semibold text-[#6cbe45]">{formatPrice(paymentInfo.curso.precio) ?? "Gratis"}</span>
        </div>
        {error ? (
          <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/30 p-4 text-xs text-[#ee2346] text-center">{error}</div>
        ) : (
          <div className="relative min-h-[260px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--ss-text3)]">
                Cargando pasarela de pago…
              </div>
            )}
            <div id="onvo-pay-container" ref={containerRef} />
          </div>
        )}
        <p className="text-xs text-[var(--ss-text3)] text-center">Pago seguro procesado por OnvoPay · PCI DSS Level 1</p>
      </div>
    </Modal>
  );
}

/* ───────────────────────────────────────────────
   SUCCESS MODAL — step 3
─────────────────────────────────────────────── */
function PaymentSuccessModal({ curso, onClose, onWhatsApp }: {
  curso: PaymentInfo["curso"]; onClose: () => void; onWhatsApp: () => void;
}) {
  return (
    <Modal title="¡Pago exitoso!" subtitle={curso.titulo} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-[var(--ss-border-md)] px-4 py-2 text-xs font-medium text-[var(--ss-text2)] hover:bg-[var(--ss-raised)] transition">
            Cerrar
          </button>
          <button type="button" onClick={onWhatsApp}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-xs font-semibold text-white transition">
            Ir a WhatsApp
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#6cbe45]/15 border border-[#6cbe45]/30 flex items-center justify-center">
          <ShoppingCart size={26} className="text-[#6cbe45]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--ss-text)]">¡Tu pago fue procesado con éxito!</p>
          <p className="text-xs text-[var(--ss-text2)] mt-1 max-w-xs">
            Hacé clic en "Ir a WhatsApp" para coordinar la fecha del curso con el equipo de SandíaShake.
          </p>
        </div>
        <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 w-full text-left divide-y divide-[var(--ss-border)]">
          <div className="flex justify-between text-sm pb-3">
            <span className="text-[var(--ss-text2)]">Curso</span>
            <span className="font-semibold text-[var(--ss-text)]">{curso.titulo}</span>
          </div>
          <div className="flex justify-between text-sm pt-3">
            <span className="text-[var(--ss-text2)]">Total pagado</span>
            <span className="font-semibold text-[#6cbe45]">{formatPrice(curso.precio) ?? "—"}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────────────────────────────
   COURSE CARD
─────────────────────────────────────────────── */
function CourseCard({ course, isAdmin, onEdit, onBuy }: {
  course: Course; isAdmin: boolean;
  onEdit: (c: Course) => void; onBuy: (c: Course) => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)]
                         shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-[var(--ss-raised)]">
        <img
          src={COURSE_IMG(course.image_id)} alt={course.titulo}
          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {course.featured && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/20 font-medium">
              <Star size={10} fill="currentColor" /> Destacado
            </span>
          )}
        </div>
        {isAdmin && !course.visible && (
          <span className="absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/60 border border-white/10">
            Oculto
          </span>
        )}
        {course.precio > 0 && (
          <div className="absolute bottom-0 right-0 m-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/20">
              {formatPrice(course.precio)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 flex-1 p-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ss-text)] leading-snug">{course.titulo}</h2>
          {course.subtitulo && (
            <p className="text-xs text-[var(--ss-text2)] mt-0.5">{course.subtitulo}</p>
          )}
        </div>

        {course.descripcion && (
          <p className="text-xs text-[var(--ss-text2)] leading-relaxed line-clamp-2 flex-1">
            {course.descripcion}
          </p>
        )}

        {/* Metadata pills */}
        <div className="flex flex-wrap gap-1.5">
          {course.duracion_label && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--ss-raised)] text-[var(--ss-text2)] border border-[var(--ss-border)]">
              <Clock size={10} /> {course.duracion_label}
            </span>
          )}
          {course.nivel && (
            <span className={clsx("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium", LEVEL_COLORS[course.nivel] ?? "bg-[var(--ss-raised)] text-[var(--ss-text2)]")}>
              <BarChart2 size={10} /> {course.nivel}
            </span>
          )}
          {course.categoria && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#6cbe45]/10 text-[#6cbe45] font-medium">
              <Tag size={10} /> {course.categoria}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-4 pb-4">
        {isAdmin ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => onEdit(course)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--ss-border-md)] px-3 py-2 text-xs font-semibold text-[var(--ss-text2)] hover:bg-[var(--ss-raised)] hover:text-[var(--ss-text)] transition">
              <Edit2 size={13} /> Editar
            </button>
            <a href={course.chat_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--ss-border-md)] px-3 py-2 text-[var(--ss-text3)] hover:text-[#6cbe45] hover:border-[#6cbe45]/40 transition">
              <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <button type="button" onClick={() => onBuy(course)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] active:scale-[.98] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150">
            <ShoppingCart size={15} />
            Comprar
          </button>
        )}
      </div>
    </article>
  );
}

/* ───────────────────────────────────────────────
   MAIN PAGE
─────────────────────────────────────────────── */
const LEVELS     = ["Todos", "Intro", "Intermedio", "Avanzado"];
const CATEGORIES = ["Todas", "Instagram", "Contenido", "Ads", "Estrategia", "Otro"];

export default function CursosPage() {
  const [courses, setCourses]           = useState<Course[]>([]);
  const [role, setRole]                 = useState<UserRole>(null);
  const [loadingCourses, setLoading]    = useState(true);
  const [q, setQ]                       = useState("");
  const [levelFilter, setLevelFilter]   = useState("Todos");
  const [catFilter, setCatFilter]       = useState("Todas");
  const [purchasingCourse, setPurchasingCourse] = useState<Course | null>(null);
  const [paymentInfo, setPaymentInfo]   = useState<PaymentInfo | null>(null);
  const [successCurso, setSuccessCurso] = useState<PaymentInfo["curso"] | null>(null);
  const [purchasing, setPurchasing]     = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseFormData | null>(null);
  const [isNew, setIsNew]               = useState(false);
  const [saving, setSaving]             = useState(false);

  const isAdmin = role === "ADMIN";

  useEffect(() => {
    fetch("/api/auth/profile").then((r) => r.json()).then((d) => setRole(d?.rol ?? null)).catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(isAdmin ? "/api/admin/cursos" : "/api/cursos");
      const data = await res.json();
      setCourses(data.cursos ?? []);
    } catch { setCourses([]); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { if (role !== null) fetchCourses(); }, [role, fetchCourses]);

  const featured = useMemo(() => courses.find((c) => c.featured) ?? courses[0], [courses]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return courses.filter((c) => {
      const matchSearch = !s || c.titulo.toLowerCase().includes(s) || (c.subtitulo ?? "").toLowerCase().includes(s) || (c.descripcion ?? "").toLowerCase().includes(s);
      return matchSearch && (levelFilter === "Todos" || c.nivel === levelFilter) && (catFilter === "Todas" || c.categoria === catFilter);
    });
  }, [courses, q, levelFilter, catFilter]);

  async function handleSaveCourse(input: CourseFormData) {
    setSaving(true);
    try {
      const isCreating = !input.id_curso;
      const res = await fetch(isCreating ? "/api/admin/cursos" : `/api/admin/cursos/${input.id_curso}`, {
        method: isCreating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al guardar");
      await fetchCourses();
      setEditingCourse(null);
    } finally { setSaving(false); }
  }

  async function handleDeleteCourse(id: number) {
    if (!confirm("¿Eliminar este curso?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cursos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al eliminar");
      await fetchCourses();
      setEditingCourse(null);
    } finally { setSaving(false); }
  }

  async function handleProceedToPayment() {
    if (!purchasingCourse) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/cursos/comprar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_curso: purchasingCourse.id_curso }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al iniciar el pago");
      setPurchasingCourse(null);
      setPaymentInfo({ paymentIntentId: data.paymentIntentId, curso: data.curso });
    } finally { setPurchasing(false); }
  }

  const handlePaid = useCallback(() => {
    if (!paymentInfo) return;
    setPaymentInfo(null);
    setSuccessCurso(paymentInfo.curso);
  }, [paymentInfo]);

  function handleGoToWhatsApp() {
    if (!successCurso) return;
    const baseUrl = successCurso.chat_url.split("?")[0];
    const lines = [
      `Hola SandíaShake, acabo de realizar el pago del curso *${successCurso.titulo}*.`, ``,
      `📚 Curso: ${successCurso.titulo}`,
      successCurso.precio > 0 ? `💰 Precio: ${formatPrice(successCurso.precio)}` : null,
      successCurso.duracion_label ? `⏱ Duración: ${successCurso.duracion_label}` : null,
      successCurso.nivel ? `📊 Nivel: ${successCurso.nivel}` : null,
      successCurso.categoria ? `🏷 Categoría: ${successCurso.categoria}` : null,
      ``, `Me gustaría coordinar los detalles y la fecha. ¡Gracias!`,
    ].filter(Boolean).join("\n");
    setSuccessCurso(null);
    window.open(`${baseUrl}?text=${encodeURIComponent(lines)}`, "_blank", "noreferrer");
  }

  function openNewCourse() {
    setIsNew(true);
    setEditingCourse({ titulo: "", subtitulo: "", descripcion: "", image_id: "1", chat_url: "", precio: 0, duracion_label: "", nivel: null, categoria: null, featured: false, visible: true });
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── HEADER ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ss-text)]">Cursos</h1>
            <p className="text-sm text-[var(--ss-text2)] mt-1">
              {isAdmin ? "Administrá el catálogo de cursos." : "Elegí un curso e iniciá tu proceso de compra."}
            </p>
          </div>
          {isAdmin && (
            <button type="button" onClick={openNewCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ee2346] hover:bg-[#d8203f] text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150 shrink-0">
              <Plus size={16} /> Nuevo curso
            </button>
          )}
        </div>

        {/* ── FEATURED HERO ──────────────────────── */}
        {!loadingCourses && featured && (
          <div className="rounded-2xl overflow-hidden border border-[var(--ss-border)] shadow-sm bg-[var(--ss-surface)]">
            <div className="grid md:grid-cols-[1.1fr_1fr]">
              {/* Text */}
              <div className="p-6 md:p-8 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-[#ee2346]/10 text-[#ee2346] font-semibold border border-[#ee2346]/20">
                    <Star size={11} fill="currentColor" /> Recomendado
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--ss-text)] leading-snug">{featured.titulo}</h2>
                    {featured.subtitulo && (
                      <p className="text-sm text-[var(--ss-text2)] mt-1">{featured.subtitulo}</p>
                    )}
                  </div>
                  {featured.descripcion && (
                    <p className="text-sm text-[var(--ss-text2)] leading-relaxed line-clamp-3">{featured.descripcion}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {featured.precio > 0 && (
                    <span className="text-sm font-bold text-[var(--ss-text)]">{formatPrice(featured.precio)}</span>
                  )}
                  {featured.duracion_label && (
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text2)]">
                      <Clock size={11} /> {featured.duracion_label}
                    </span>
                  )}
                  {featured.nivel && (
                    <span className={clsx("inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium", LEVEL_COLORS[featured.nivel] ?? "bg-[var(--ss-raised)] text-[var(--ss-text2)]")}>
                      <BarChart2 size={11} /> {featured.nivel}
                    </span>
                  )}
                </div>
                <div>
                  {isAdmin ? (
                    <button type="button" onClick={() => { setIsNew(false); setEditingCourse({ ...featured }); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--ss-border-md)] bg-[var(--ss-raised)] hover:bg-[var(--ss-input)] px-4 py-2.5 text-sm font-semibold text-[var(--ss-text)] transition">
                      <Edit2 size={15} /> Editar curso
                    </button>
                  ) : (
                    <button type="button" onClick={() => setPurchasingCourse(featured)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150">
                      <ShoppingCart size={16} /> Comprar curso
                    </button>
                  )}
                </div>
              </div>
              {/* Image */}
              <div className="relative min-h-[200px] md:min-h-0 bg-[var(--ss-raised)]">
                <img src={COURSE_IMG(featured.image_id)} alt={featured.titulo}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }} />
              </div>
            </div>
          </div>
        )}

        {/* ── FILTERS ────────────────────────────── */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ss-text3)] pointer-events-none" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cursos…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--ss-surface)] border border-[var(--ss-border)] text-[var(--ss-text)] text-sm placeholder:text-[var(--ss-text3)] outline-none focus:border-[#6cbe45]/50 focus:ring-2 focus:ring-[#6cbe45]/15 transition"
            />
          </div>

          {/* Level + Category pill tabs */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {LEVELS.map((lvl) => (
                <button key={lvl} onClick={() => setLevelFilter(lvl)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                    levelFilter === lvl
                      ? "bg-[#ee2346] text-white shadow-sm"
                      : "bg-[var(--ss-surface)] border border-[var(--ss-border)] text-[var(--ss-text2)] hover:text-[var(--ss-text)]"
                  )}>
                  {lvl}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                    catFilter === cat
                      ? "bg-[#6cbe45] text-white shadow-sm"
                      : "bg-[var(--ss-surface)] border border-[var(--ss-border)] text-[var(--ss-text2)] hover:text-[var(--ss-text)]"
                  )}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── COURSES GRID ───────────────────────── */}
        {loadingCourses ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] overflow-hidden animate-pulse">
                <div className="aspect-video bg-[var(--ss-raised)]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[var(--ss-raised)] rounded-lg w-3/4" />
                  <div className="h-3 bg-[var(--ss-raised)] rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--ss-raised)] flex items-center justify-center">
              <BookOpen size={24} className="text-[var(--ss-text3)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ss-text2)]">No hay cursos que coincidan</p>
            <p className="text-xs text-[var(--ss-text3)]">Probá ajustando los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard
                key={course.id_curso} course={course} isAdmin={isAdmin}
                onEdit={(c) => { setIsNew(false); setEditingCourse({ ...c }); }}
                onBuy={setPurchasingCourse}
              />
            ))}
          </section>
        )}
      </div>

      {/* Modals */}
      {editingCourse && (
        <CourseModal isNew={isNew} course={editingCourse} onClose={() => setEditingCourse(null)}
          onSave={handleSaveCourse} onDelete={handleDeleteCourse} saving={saving} />
      )}
      {purchasingCourse && (
        <PurchaseModal course={purchasingCourse} onClose={() => setPurchasingCourse(null)}
          onNext={handleProceedToPayment} loading={purchasing} />
      )}
      {paymentInfo && (
        <OnvoPayModal paymentInfo={paymentInfo} onClose={() => setPaymentInfo(null)} onPaid={handlePaid} />
      )}
      {successCurso && (
        <PaymentSuccessModal curso={successCurso} onClose={() => setSuccessCurso(null)} onWhatsApp={handleGoToWhatsApp} />
      )}
    </>
  );
}
