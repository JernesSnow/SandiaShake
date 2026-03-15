"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "../../components/Shell";
import {
  Search,
  Filter,
  MessageCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Star,
  ShoppingCart,
  ExternalLink,
} from "react-feather";

type CourseLevel = "Intro" | "Intermedio" | "Avanzado";
type CourseCategory = "Instagram" | "Ads" | "Contenido" | "Estrategia" | "Otro";

type Course = {
  id_curso: number;
  titulo: string;
  subtitulo: string | null;
  descripcion: string | null;
  precio: number;
  image_id: string;
  chat_url: string;
  duracion_label: string | null;
  nivel: CourseLevel | null;
  categoria: CourseCategory | null;
  featured: boolean;
  visible?: boolean;
};

type UserRole = "ADMIN" | "COLABORADOR" | "CLIENTE" | null;

const COURSE_IMG = (id: string) => `/${id}.png`;
const FALLBACK_IMG = "/mock-logo-sandia-con-chole.png";

function formatPrice(precio: number) {
  if (!precio) return null;
  return `₡${precio.toLocaleString("es-CR")}`;
}

/* -------------------------
   MODAL WRAPPER
--------------------------*/
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto bg-[#333132] border border-[#fffef9]/10">
        <div className="px-5 py-3 border-b border-[#fffef9]/10 bg-[#3d3b3c] rounded-t-xl flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#fffef9]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#fffef9]/60 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="text-[#fffef9]/70 hover:text-[#fffef9]"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[#fffef9]/10 bg-[#3d3b3c] rounded-b-xl">
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------
   ADMIN CRUD MODAL
--------------------------*/
type CourseFormData = Omit<Course, "id_curso"> & { id_curso?: number };

function CourseModal({
  isNew,
  course,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  isNew: boolean;
  course: CourseFormData;
  onClose: () => void;
  onSave: (course: CourseFormData) => void;
  onDelete: (id: number) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CourseFormData>(course);

  function set<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
            <button
              type="button"
              onClick={() => onDelete(form.id_curso!)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md border border-[#ee2346]/40 px-3 py-2 text-xs font-semibold text-[#ee2346] hover:bg-[#ee2346]/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-[#fffef9]/20 px-3 py-2 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="course-form"
            disabled={saving}
            className="rounded-md bg-[#ee2346] text-[#fffef9] px-3 py-2 text-xs font-semibold hover:bg-[#d8203f] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Título *</label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Subtítulo</label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.subtitulo ?? ""}
              onChange={(e) => set("subtitulo", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Descripción</label>
            <textarea
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70 min-h-[100px]"
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Link WhatsApp (wa.me...) *
            </label>
            <input
              type="url"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.chat_url}
              onChange={(e) => set("chat_url", e.target.value)}
              placeholder="https://wa.me/506XXXXXXXX?text=..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Precio (₡)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.precio}
              onChange={(e) => set("precio", Number(e.target.value))}
              placeholder="35000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Duración</label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.duracion_label ?? ""}
              onChange={(e) => set("duracion_label", e.target.value)}
              placeholder="90 min"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Nivel</label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.nivel ?? ""}
              onChange={(e) => set("nivel", (e.target.value as CourseLevel) || null)}
            >
              <option value="">—</option>
              <option value="Intro">Intro</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">Categoría</label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.categoria ?? ""}
              onChange={(e) => set("categoria", (e.target.value as CourseCategory) || null)}
            >
              <option value="">—</option>
              <option value="Instagram">Instagram</option>
              <option value="Contenido">Contenido</option>
              <option value="Ads">Ads</option>
              <option value="Estrategia">Estrategia</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Imagen (1, 2 o 3)
            </label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.image_id}
              onChange={(e) => set("image_id", e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-xs text-[#fffef9]/80 select-none">
              <input
                type="checkbox"
                checked={!!form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="rounded border-[#fffef9]/25 bg-[#4a4748] text-[#ee2346] focus:ring-[#ee2346]"
              />
              Marcar como destacado
            </label>
            <label className="flex items-center gap-2 text-xs text-[#fffef9]/80 select-none">
              <input
                type="checkbox"
                checked={form.visible !== false}
                onChange={(e) => set("visible", e.target.checked)}
                className="rounded border-[#fffef9]/25 bg-[#4a4748] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Visible para clientes
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------
   PURCHASE MODAL — Step 1: Course details
--------------------------*/
function PurchaseModal({
  course,
  onClose,
  onNext,
  loading = false,
}: {
  course: Course;
  onClose: () => void;
  onNext: () => void;
  loading?: boolean;
}) {
  const priceDisplay = formatPrice(course.precio);

  return (
    <Modal
      title={course.titulo}
      subtitle={course.subtitulo ?? undefined}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#fffef9]/20 px-3 py-2 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <ShoppingCart size={14} />
            {loading ? "Procesando…" : "Proceder al pago"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-[#4a4748] border border-[#fffef9]/10">
          <img
            src={COURSE_IMG(course.image_id)}
            alt={course.titulo}
            className="w-full h-44 object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
          />
        </div>

        {course.descripcion && (
          <p className="text-sm text-[#fffef9]/80 leading-relaxed">{course.descripcion}</p>
        )}

        <div className="rounded-lg bg-[#2b2b30] border border-[#fffef9]/10 p-4 space-y-2">
          {priceDisplay && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#fffef9]/60">Precio</span>
              <span className="font-semibold text-[#fffef9]">{priceDisplay}</span>
            </div>
          )}
          {course.duracion_label && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#fffef9]/60">Duración</span>
              <span className="font-semibold text-[#fffef9]">{course.duracion_label}</span>
            </div>
          )}
          {course.nivel && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#fffef9]/60">Nivel</span>
              <span className="font-semibold text-[#fffef9]">{course.nivel}</span>
            </div>
          )}
          {course.categoria && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#fffef9]/60">Categoría</span>
              <span className="font-semibold text-[#fffef9]">{course.categoria}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------
   PAYMENT MODAL — Step 2: OnvoPay
--------------------------*/
type PaymentInfo = {
  paymentIntentId: string;
  curso: Pick<Course, "titulo" | "chat_url" | "precio" | "duracion_label" | "nivel" | "categoria">;
};

function OnvoPayModal({
  paymentInfo,
  onClose,
  onPaid,
}: {
  paymentInfo: PaymentInfo;
  onClose: () => void;
  onPaid: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function loadSdk(): Promise<void> {
      return new Promise((resolve, reject) => {
        // Use the correct SDK URL from OnvoPay docs
        const SCRIPT_SRC = "https://sdk.onvopay.com/sdk.js";
        if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          // Already loaded
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
            // Per docs: check status field — succeeded = paid, requires_payment_method = declined
            if (data?.status === "succeeded") {
              onPaid();
            } else if (data?.status === "requires_action") {
              // 3DS handled automatically by SDK
            } else {
              setError("El pago fue declinado. Por favor intentá con otro método de pago.");
            }
          },
          onError: (data: any) => {
            if (!cancelled) setError(data?.message ?? "Error al procesar el pago.");
          },
        }).render("#onvo-pay-container");

      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "No se pudo cargar la pasarela de pago.");
      }
    }

    mount();
    return () => { cancelled = true; };
  }, [paymentInfo, onPaid]);

  return (
    <Modal
      title="Pago del curso"
      subtitle={paymentInfo.curso.titulo}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Order summary */}
        <div className="rounded-lg bg-[#2b2b30] border border-[#fffef9]/10 p-3 flex items-center justify-between">
          <span className="text-sm text-[#fffef9]/80">{paymentInfo.curso.titulo}</span>
          <span className="text-sm font-semibold text-[#6cbe45]">
            {formatPrice(paymentInfo.curso.precio) ?? "Gratis"}
          </span>
        </div>

        {/* OnvoPay form */}
        {error ? (
          <div className="rounded-lg bg-[#ee2346]/10 border border-[#ee2346]/30 p-4 text-xs text-[#ee2346] text-center">
            {error}
          </div>
        ) : (
          <div className="relative min-h-[260px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[#fffef9]/50">
                Cargando pasarela de pago…
              </div>
            )}
            <div id="onvo-pay-container" ref={containerRef} />
          </div>
        )}

        <p className="text-xs text-[#fffef9]/40 text-center">
          Pago seguro procesado por OnvoPay · PCI DSS Level 1
        </p>
      </div>
    </Modal>
  );
}

/* -------------------------
   SUCCESS MODAL — Step 3
--------------------------*/
function PaymentSuccessModal({
  curso,
  onClose,
  onWhatsApp,
}: {
  curso: PaymentInfo["curso"];
  onClose: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <Modal
      title="¡Pago exitoso!"
      subtitle={curso.titulo}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="rounded-md border border-[#fffef9]/20 px-3 py-2 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]">
            Cerrar
          </button>
          <button type="button" onClick={onWhatsApp}
            className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5aa63d] px-3 py-2 text-xs font-semibold text-white">
            <MessageCircle size={14} />
            Ir a WhatsApp
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[#6cbe45]/15 border border-[#6cbe45]/40 flex items-center justify-center">
          <ShoppingCart size={24} className="text-[#6cbe45]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#fffef9]">¡Tu pago fue procesado con éxito!</p>
          <p className="text-xs text-[#fffef9]/60 mt-1">
            Hacé clic en "Ir a WhatsApp" para coordinar la fecha del curso con el equipo de SandíaShake.
          </p>
        </div>
        <div className="rounded-lg bg-[#2b2b30] border border-[#fffef9]/10 p-4 w-full text-left space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#fffef9]/60">Curso</span>
            <span className="font-semibold text-[#fffef9]">{curso.titulo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#fffef9]/60">Total pagado</span>
            <span className="font-semibold text-[#6cbe45]">{formatPrice(curso.precio) ?? "—"}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------
   MAIN PAGE
--------------------------*/
export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [role, setRole] = useState<UserRole>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // customer UX state
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [purchasingCourse, setPurchasingCourse] = useState<Course | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [successCurso, setSuccessCurso] = useState<PaymentInfo["curso"] | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // admin UX state
  const [editingCourse, setEditingCourse] = useState<CourseFormData | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "ADMIN";

  // Fetch role
  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => setRole(d?.rol ?? null))
      .catch(() => {});
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const endpoint = isAdmin ? "/api/admin/cursos" : "/api/cursos";
      const res = await fetch(endpoint);
      const data = await res.json();
      setCourses(data.cursos ?? []);
    } catch {
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (role !== null) fetchCourses();
  }, [role, fetchCourses]);

  const featured = useMemo(
    () => courses.find((c) => c.featured) ?? courses[0],
    [courses]
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.titulo.toLowerCase().includes(search) ||
        (c.subtitulo ?? "").toLowerCase().includes(search) ||
        (c.descripcion ?? "").toLowerCase().includes(search);
      const matchesLevel = levelFilter === "Todos" || c.nivel === levelFilter;
      const matchesCategory = categoryFilter === "Todas" || c.categoria === categoryFilter;
      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [courses, q, levelFilter, categoryFilter]);

  // Admin: save (create or update)
  async function handleSaveCourse(input: CourseFormData) {
    setSaving(true);
    try {
      const isCreating = !input.id_curso;
      const url = isCreating ? "/api/admin/cursos" : `/api/admin/cursos/${input.id_curso}`;
      const method = isCreating ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al guardar");
      await fetchCourses();
      setEditingCourse(null);
      setIsNew(false);
    } finally {
      setSaving(false);
    }
  }

  // Admin: delete
  async function handleDeleteCourse(id: number) {
    if (!confirm("¿Eliminar este curso?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cursos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al eliminar");
      await fetchCourses();
      setEditingCourse(null);
    } finally {
      setSaving(false);
    }
  }

  // Client: step 1 → create OnvoPay intent → step 2
  async function handleProceedToPayment() {
    if (!purchasingCourse) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/cursos/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_curso: purchasingCourse.id_curso }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "Error al iniciar el pago");
      setPurchasingCourse(null);
      setPaymentInfo({ paymentIntentId: data.paymentIntentId, curso: data.curso });
    } finally {
      setPurchasing(false);
    }
  }

  // Client: payment succeeded → show success screen
  const handlePaid = useCallback(() => {
    if (!paymentInfo) return;
    setPaymentInfo(null);
    setSuccessCurso(paymentInfo.curso);
  }, [paymentInfo]);

  // Client: go to WhatsApp with course details pre-filled
  function handleGoToWhatsApp() {
    if (!successCurso) return;
    const baseUrl = successCurso.chat_url.split("?")[0];
    const lines = [
      `Hola SandíaShake, acabo de realizar el pago del curso *${successCurso.titulo}*.`,
      ``,
      `📚 Curso: ${successCurso.titulo}`,
      successCurso.precio > 0 ? `💰 Precio: ${formatPrice(successCurso.precio)}` : null,
      successCurso.duracion_label ? `⏱ Duración: ${successCurso.duracion_label}` : null,
      successCurso.nivel ? `📊 Nivel: ${successCurso.nivel}` : null,
      successCurso.categoria ? `🏷 Categoría: ${successCurso.categoria}` : null,
      ``,
      `Me gustaría coordinar los detalles y la fecha. ¡Gracias!`,
    ].filter((l) => l !== null).join("\n");
    setSuccessCurso(null);
    window.open(`${baseUrl}?text=${encodeURIComponent(lines)}`, "_blank", "noreferrer");
  }

  function openNewCourse() {
    setIsNew(true);
    setEditingCourse({
      titulo: "",
      subtitulo: "",
      descripcion: "",
      image_id: "1",
      chat_url: "",
      precio: 0,
      duracion_label: "",
      nivel: null,
      categoria: null,
      featured: false,
      visible: true,
    });
  }

  function openEditCourse(course: Course) {
    setIsNew(false);
    setEditingCourse({ ...course });
  }

  return (
    <Shell>
      <div className="flex flex-col gap-6 text-[#fffef9]">
        {/* HEADER */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-[#fffef9]">Cursos</h1>
              <p className="text-sm text-[#fffef9]/70 mt-1">
                {isAdmin
                  ? "Administrá el catálogo de cursos."
                  : "Elegí un curso e iniciá tu proceso de compra."}
              </p>
            </div>
          </div>

          {/* Featured banner */}
          {!loadingCourses && featured && (
            <div className="rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 overflow-hidden shadow-sm">
              <div className="grid md:grid-cols-[1.2fr_1fr]">
                <div className="p-5">
                  <div className="inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/40">
                    <Star size={12} />
                    Recomendado
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[#fffef9]">{featured.titulo}</h2>
                  {featured.subtitulo && (
                    <p className="text-sm text-[#fffef9]/60">{featured.subtitulo}</p>
                  )}
                  {featured.descripcion && (
                    <p className="mt-3 text-sm text-[#fffef9]/75 leading-relaxed line-clamp-3">
                      {featured.descripcion}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {featured.precio > 0 && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Precio:{" "}
                        <span className="font-semibold text-white">{formatPrice(featured.precio)}</span>
                      </span>
                    )}
                    {featured.duracion_label && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Duración:{" "}
                        <span className="font-semibold text-white">{featured.duracion_label}</span>
                      </span>
                    )}
                    {featured.nivel && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Nivel:{" "}
                        <span className="font-semibold text-white">{featured.nivel}</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-5">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => openEditCourse(featured)}
                        className="inline-flex items-center gap-2 rounded-md border border-[#fffef9]/20 bg-[#4a4748] hover:bg-[#3a3738] px-4 py-2 text-xs font-semibold text-[#fffef9]/90"
                      >
                        <Edit2 size={14} />
                        Editar curso
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPurchasingCourse(featured)}
                        className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-xs font-semibold text-white"
                      >
                        <ShoppingCart size={16} />
                        Comprar curso
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative bg-[#4a4748]">
                  <img
                    src={COURSE_IMG(featured.image_id)}
                    className="w-full h-full object-cover max-h-[260px] md:max-h-none"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                </div>
              </div>
            </div>
          )}
        </header>

        {/* FILTER BAR */}
        <section className="rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px] items-end">
            <div>
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">Buscar</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Search size={14} />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej: Instagram, Ads, Calendario…"
                  className="w-full rounded-md px-3 py-2 pl-8 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">Nivel</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Filter size={14} />
                </span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full rounded-md px-3 py-2 pl-8 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                >
                  <option>Todos</option>
                  <option>Intro</option>
                  <option>Intermedio</option>
                  <option>Avanzado</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">Categoría</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Filter size={14} />
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-md px-3 py-2 pl-8 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                >
                  <option>Todas</option>
                  <option>Instagram</option>
                  <option>Contenido</option>
                  <option>Ads</option>
                  <option>Estrategia</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-4 flex items-center justify-between border-t border-[#fffef9]/10 pt-4">
              <p className="text-xs text-[#fffef9]/60">
                Vista de administrador — podés agregar, editar y eliminar cursos.
              </p>
              <button
                type="button"
                onClick={openNewCourse}
                className="inline-flex items-center gap-2 rounded-md bg-[#ee2346] text-white px-4 py-2 text-xs font-semibold hover:bg-[#d8203f]"
              >
                <Plus size={16} />
                Nuevo curso
              </button>
            </div>
          )}
        </section>

        {/* COURSES GRID */}
        {loadingCourses ? (
          <div className="text-center text-sm text-[#fffef9]/60 py-10">Cargando cursos…</div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <article
                key={course.id_curso}
                className="flex flex-col overflow-hidden rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative w-full aspect-video overflow-hidden bg-[#4a4748]">
                  <img
                    src={COURSE_IMG(course.image_id)}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                  {course.featured && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/40">
                      <Star size={11} />
                      Destacado
                    </div>
                  )}
                  {isAdmin && !course.visible && (
                    <div className="absolute top-3 right-3 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-[#fffef9]/60 border border-[#fffef9]/10">
                      Oculto
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[#fffef9]">{course.titulo}</h2>
                      {course.subtitulo && (
                        <p className="text-xs text-[#fffef9]/60">{course.subtitulo}</p>
                      )}
                    </div>
                    {course.precio > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80 whitespace-nowrap">
                        {formatPrice(course.precio)}
                      </span>
                    )}
                  </div>

                  {course.descripcion && (
                    <p className="text-xs text-[#fffef9]/75 leading-relaxed line-clamp-3">
                      {course.descripcion}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[#fffef9]/70">
                    {course.duracion_label && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.duracion_label}
                      </span>
                    )}
                    {course.nivel && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.nivel}
                      </span>
                    )}
                    {course.categoria && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.categoria}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card actions */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditCourse(course)}
                        className="inline-flex items-center justify-center gap-2 flex-1 rounded-md border border-[#fffef9]/25 px-3 py-2 text-xs font-semibold text-[#fffef9]/85 hover:bg-[#4a4748]"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <a
                        href={course.chat_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir WhatsApp"
                        className="inline-flex items-center justify-center rounded-md border border-[#fffef9]/15 px-3 py-2 text-[#fffef9]/50 hover:text-[#6cbe45] hover:border-[#6cbe45]/40"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPurchasingCourse(course)}
                      className="inline-flex items-center justify-center gap-2 flex-1 rounded-md bg-[#6cbe45] text-white px-3 py-2 text-xs font-semibold hover:bg-[#5aa63d] active:scale-[.98] transition"
                    >
                      <ShoppingCart size={15} />
                      Comprar
                    </button>
                  )}
                </div>
              </article>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-[#fffef9]/60 py-10">
                No se encontraron cursos con esos filtros.
              </div>
            )}
          </section>
        )}
      </div>

      {/* STEP 1 — Course details */}
      {purchasingCourse && (
        <PurchaseModal
          course={purchasingCourse}
          onClose={() => setPurchasingCourse(null)}
          onNext={handleProceedToPayment}
          loading={purchasing}
        />
      )}

      {/* STEP 2 — OnvoPay payment form */}
      {paymentInfo && (
        <OnvoPayModal
          paymentInfo={paymentInfo}
          onClose={() => setPaymentInfo(null)}
          onPaid={handlePaid}
        />
      )}

      {/* STEP 3 — Success + WhatsApp */}
      {successCurso && (
        <PaymentSuccessModal
          curso={successCurso}
          onClose={() => setSuccessCurso(null)}
          onWhatsApp={handleGoToWhatsApp}
        />
      )}

      {/* ADMIN CRUD MODAL */}
      {editingCourse && (
        <CourseModal
          isNew={isNew}
          course={editingCourse}
          onClose={() => { setEditingCourse(null); setIsNew(false); }}
          onSave={handleSaveCourse}
          onDelete={handleDeleteCourse}
          saving={saving}
        />
      )}
    </Shell>
  );
}
