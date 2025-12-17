"use client";

import { useMemo, useState } from "react";
import { Shell } from "../../components/Shell";
import {
  Search,
  Filter,
  MessageCircle,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  X,
  Star,
} from "react-feather";

type CourseLevel = "Intro" | "Intermedio" | "Avanzado";
type CourseCategory = "Instagram" | "Ads" | "Contenido" | "Estrategia" | "Otro";

type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;

  /** images in /public root: /1.png /2.png /3.png */
  imageId: "1" | "2" | "3";

  // Customer purchase flow:
  whatsappLink: string;
  priceLabel?: string;
  durationLabel?: string;
  level?: CourseLevel;
  category?: CourseCategory;
  featured?: boolean;
};

const COURSE_IMG = (id: Course["imageId"]) => `/${id}.png`;
const FALLBACK_IMG = "/mock-logo-sandia-con-chole.png";

const INITIAL_COURSES: Course[] = [
  {
    id: "curso-ig-basico",
    title: "Instagram Básico para PYMEs",
    subtitle: "Nivel introductorio",
    description:
      "Aprendé a configurar tu cuenta, optimizar tu biografía y publicar contenido básico para tu negocio.",
    imageId: "1",
    whatsappLink:
      "https://wa.me/50688881111?text=Hola%20Sand%C3%ADaShake%2C%20quiero%20reservar%20el%20curso%20Instagram%20B%C3%A1sico%20para%20PYMEs.",
    priceLabel: "₡35.000",
    durationLabel: "90 min",
    level: "Intro",
    category: "Instagram",
    featured: true,
  },
  {
    id: "curso-calendario",
    title: "Calendario de Contenidos 101",
    subtitle: "Planificación mensual",
    description:
      "Diseñá un calendario de contenidos estratégico y alineado a los objetivos de tu marca.",
    imageId: "2",
    whatsappLink:
      "https://wa.me/50688881111?text=Hola%20Sand%C3%ADaShake%2C%20quiero%20reservar%20el%20curso%20Calendario%20de%20Contenidos%20101.",
    priceLabel: "₡29.000",
    durationLabel: "75 min",
    level: "Intro",
    category: "Contenido",
  },
  {
    id: "curso-ads",
    title: "Meta Ads para Principiantes",
    subtitle: "Campañas pagadas",
    description:
      "Creá tus primeras campañas, definí audiencias y entendé las métricas clave de rendimiento.",
    imageId: "3",
    whatsappLink:
      "https://wa.me/50688881111?text=Hola%20Sand%C3%ADaShake%2C%20quiero%20reservar%20el%20curso%20Meta%20Ads%20para%20Principiantes.",
    priceLabel: "₡45.000",
    durationLabel: "2 horas",
    level: "Intermedio",
    category: "Ads",
  },
];

/* -------------------------
   MODAL WRAPPER (same style)
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
type CourseModalProps = {
  isNew: boolean;
  course: Course;
  onClose: () => void;
  onSave: (course: Course) => void;
  onDelete: (id: string) => void;
};

function CourseModal({
  isNew,
  course,
  onClose,
  onSave,
  onDelete,
}: CourseModalProps) {
  const [form, setForm] = useState<Course>(course);

  function updateField<K extends keyof Course>(key: K, value: Course[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return alert("El curso debe tener un título.");
    if (!form.whatsappLink.trim())
      return alert("Debes colocar el link de WhatsApp.");

    onSave(form);
  }

  return (
    <Modal
      title={isNew ? "Nuevo curso" : "Editar curso"}
      subtitle="Configura el catálogo visible para clientes."
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button
              type="button"
              onClick={() => onDelete(form.id)}
              className="inline-flex items-center gap-2 rounded-md border border-[#ee2346]/40 px-3 py-2 text-xs font-semibold text-[#ee2346] hover:bg-[#ee2346]/10"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#fffef9]/20 px-3 py-2 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="course-form"
            className="rounded-md bg-[#ee2346] text-[#fffef9] px-3 py-2 text-xs font-semibold hover:bg-[#d8203f]"
          >
            Guardar
          </button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              ID (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.id}
              onChange={(e) => updateField("id", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Título *
            </label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Subtítulo
            </label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.subtitle}
              onChange={(e) => updateField("subtitle", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Descripción
            </label>
            <textarea
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70 min-h-[110px]"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Imagen (usa 1, 2 o 3)
            </label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.imageId}
              onChange={(e) =>
                updateField("imageId", e.target.value as Course["imageId"])
              }
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>

            <p className="mt-2 text-[11px] text-[#fffef9]/60">
              Se mostrará: <span className="text-white">{COURSE_IMG(form.imageId)}</span>
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Link WhatsApp (wa.me...) *
            </label>
            <input
              type="url"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.whatsappLink}
              onChange={(e) => updateField("whatsappLink", e.target.value)}
              placeholder="https://wa.me/506XXXXXXXX?text=..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Precio (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.priceLabel ?? ""}
              onChange={(e) => updateField("priceLabel", e.target.value)}
              placeholder="₡35.000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Duración (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.durationLabel ?? ""}
              onChange={(e) => updateField("durationLabel", e.target.value)}
              placeholder="90 min"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Nivel (opcional)
            </label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.level ?? ""}
              onChange={(e) =>
                updateField(
                  "level",
                  (e.target.value as CourseLevel) || undefined
                )
              }
            >
              <option value="">—</option>
              <option value="Intro">Intro</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
              Categoría (opcional)
            </label>
            <select
              className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
              value={form.category ?? ""}
              onChange={(e) =>
                updateField(
                  "category",
                  (e.target.value as CourseCategory) || undefined
                )
              }
            >
              <option value="">—</option>
              <option value="Instagram">Instagram</option>
              <option value="Contenido">Contenido</option>
              <option value="Ads">Ads</option>
              <option value="Estrategia">Estrategia</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="featured"
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => updateField("featured", e.target.checked)}
              className="rounded border-[#fffef9]/25 bg-[#4a4748] text-[#6cbe45] focus:ring-[#6cbe45]"
            />
            <label htmlFor="featured" className="text-xs text-[#fffef9]/80">
              Marcar como destacado
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------
   CUSTOMER DETAILS MODAL (same style)
--------------------------*/
function CourseDetailsModal({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  return (
    <Modal
      title={course.title}
      subtitle={course.subtitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#fffef9]/20 px-3 py-2 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]"
          >
            Cerrar
          </button>
          <a
            href={course.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5aa63d] px-3 py-2 text-xs font-semibold text-white"
          >
            <MessageCircle size={16} />
            Reservar por WhatsApp
          </a>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
        <div className="rounded-lg overflow-hidden bg-[#4a4748] border border-[#fffef9]/10">
          <img
            src={COURSE_IMG(course.imageId)}
            alt={course.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-[#2b2b30] border border-[#fffef9]/10 p-4">
            <div className="text-xs text-[#fffef9]/60">Detalles</div>
            <div className="mt-2 space-y-1 text-sm text-[#fffef9]/90">
              {course.priceLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-[#fffef9]/70 text-xs">Precio</span>
                  <span className="font-semibold">{course.priceLabel}</span>
                </div>
              )}
              {course.durationLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-[#fffef9]/70 text-xs">Duración</span>
                  <span className="font-semibold">{course.durationLabel}</span>
                </div>
              )}
              {course.level && (
                <div className="flex items-center justify-between">
                  <span className="text-[#fffef9]/70 text-xs">Nivel</span>
                  <span className="font-semibold">{course.level}</span>
                </div>
              )}
              {course.category && (
                <div className="flex items-center justify-between">
                  <span className="text-[#fffef9]/70 text-xs">Categoría</span>
                  <span className="font-semibold">{course.category}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[#2b2b30] border border-[#fffef9]/10 p-4">
            <div className="text-xs text-[#fffef9]/60">Descripción</div>
            <p className="mt-2 text-sm text-[#fffef9]/80 leading-relaxed">
              {course.description || "Sin descripción por ahora."}
            </p>
          </div>

          <a
            href={course.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#fffef9]/80 hover:text-white"
          >
            <ExternalLink size={14} />
            Abrir chat de WhatsApp en una nueva pestaña
          </a>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------
   MAIN PAGE
--------------------------*/
export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);

  // customer UX state
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("Todos");
  const [category, setCategory] = useState<string>("Todas");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // admin UX state
  const [adminMode, setAdminMode] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isNew, setIsNew] = useState(false);

  const featured = useMemo(
    () => courses.find((c) => c.featured) ?? courses[0],
    [courses]
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search) ||
        c.subtitle.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search);

      const matchesLevel = level === "Todos" || c.level === level;
      const matchesCategory = category === "Todas" || c.category === category;

      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [courses, q, level, category]);

  function openNewCourse() {
    setIsNew(true);
    setEditingCourse({
      id: "",
      title: "",
      subtitle: "",
      description: "",
      imageId: "1",
      whatsappLink: "",
      priceLabel: "",
      durationLabel: "",
      level: "Intro",
      category: "Otro",
      featured: false,
    });
  }

  function openEditCourse(course: Course) {
    setIsNew(false);
    setEditingCourse(course);
  }

  function handleDeleteCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setEditingCourse(null);
  }

  function handleSaveCourse(input: Course) {
    if (!input.title.trim()) return alert("El curso debe tener un título.");
    if (!input.whatsappLink.trim())
      return alert("Debes colocar el link de WhatsApp.");

    if (isNew) {
      const id = input.id || `curso-${Date.now()}`;
      setCourses((prev) => [...prev, { ...input, id }]);
    } else {
      setCourses((prev) =>
        prev.map((c) => (c.id === input.id ? { ...input } : c))
      );
    }

    setIsNew(false);
    setEditingCourse(null);
  }

  return (
    <Shell>
      <div className="flex flex-col gap-6 text-[#fffef9]">
        {/* CUSTOMER HEADER */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-[#fffef9]">
                Cursos
              </h1>
              <p className="text-sm text-[#fffef9]/70 mt-1">
                Elegí un curso y reservá por WhatsApp. El pago/booking se gestiona fuera de la plataforma.
              </p>
            </div>

            {/* Admin mode toggle */}
            <label className="flex items-center gap-2 text-xs text-[#fffef9]/70 select-none">
              <input
                type="checkbox"
                checked={adminMode}
                onChange={(e) => setAdminMode(e.target.checked)}
                className="rounded border-[#fffef9]/25 bg-[#4a4748] text-[#ee2346] focus:ring-[#ee2346]"
              />
              Modo admin
            </label>
          </div>

          {/* Featured banner */}
          {featured && (
            <div className="rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 overflow-hidden shadow-sm">
              <div className="grid md:grid-cols-[1.2fr_1fr]">
                <div className="p-5">
                  <div className="inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/40">
                    <Star size={12} />
                    Recomendado
                  </div>

                  <h2 className="mt-3 text-lg font-semibold text-[#fffef9]">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-[#fffef9]/60">{featured.subtitle}</p>

                  <p className="mt-3 text-sm text-[#fffef9]/75 leading-relaxed line-clamp-3">
                    {featured.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {featured.priceLabel && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Precio:{" "}
                        <span className="font-semibold text-white">
                          {featured.priceLabel}
                        </span>
                      </span>
                    )}
                    {featured.durationLabel && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Duración:{" "}
                        <span className="font-semibold text-white">
                          {featured.durationLabel}
                        </span>
                      </span>
                    )}
                    {featured.level && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Nivel:{" "}
                        <span className="font-semibold text-white">
                          {featured.level}
                        </span>
                      </span>
                    )}
                    {featured.category && (
                      <span className="px-2 py-1 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        Categoría:{" "}
                        <span className="font-semibold text-white">
                          {featured.category}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(featured)}
                      className="inline-flex items-center justify-center rounded-md border border-[#fffef9]/20 bg-[#4a4748] hover:bg-[#3a3738] px-4 py-2 text-xs font-semibold text-[#fffef9]/90"
                    >
                      Ver detalles
                    </button>
                    <a
                      href={featured.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-xs font-semibold text-white"
                    >
                      <MessageCircle size={16} />
                      Reservar por WhatsApp
                    </a>
                  </div>
                </div>

                <div className="relative bg-[#4a4748]">
                  <img
                    src={COURSE_IMG(featured.imageId)}
                    className="w-full h-full object-cover max-h-[260px] md:max-h-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </header>

        {/* FILTER BAR */}
        <section className="rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px] items-end">
            <div>
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">
                Buscar
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Search size={14} />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej: Instagram, Ads, Calendario..."
                  className="w-full rounded-md px-3 py-2 pl-8 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">
                Nivel
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Filter size={14} />
                </span>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
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
              <label className="text-xs font-medium text-[#fffef9]/80 block mb-1">
                Categoría
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40">
                  <Filter size={14} />
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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

          {/* Admin actions */}
          {adminMode && (
            <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between border-t border-[#fffef9]/10 pt-4">
              <p className="text-xs text-[#fffef9]/60">
                Modo admin: podés agregar/editar cursos visibles para clientes.
              </p>

              <button
                type="button"
                onClick={openNewCourse}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ee2346] text-white px-4 py-2 text-xs font-semibold hover:bg-[#d8203f] active:scale-[.98]"
              >
                <Plus size={16} />
                Nuevo curso
              </button>
            </div>
          )}
        </section>

        {/* COURSES GRID */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={course.id}
              className="flex flex-col overflow-hidden rounded-xl bg-[#3d3b3c] border border-[#fffef9]/10 shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                type="button"
                onClick={() => setSelectedCourse(course)}
                className="text-left"
                title="Ver detalles"
              >
                <div className="relative w-full aspect-video overflow-hidden bg-[#4a4748]">
                  <img
                    src={COURSE_IMG(course.imageId)}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                  />
                  {course.featured && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-full bg-[#ee2346]/20 text-[#ffb3c2] border border-[#ee2346]/40">
                      <Star size={12} />
                      Destacado
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[#fffef9]">
                        {course.title}
                      </h2>
                      <p className="text-xs text-[#fffef9]/60">
                        {course.subtitle}
                      </p>
                    </div>

                    {course.priceLabel && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2b2b30] border border-[#fffef9]/10 text-[#fffef9]/80">
                        {course.priceLabel}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#fffef9]/75 leading-relaxed line-clamp-3">
                    {course.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-[#fffef9]/70">
                    {course.durationLabel && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.durationLabel}
                      </span>
                    )}
                    {course.level && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.level}
                      </span>
                    )}
                    {course.category && (
                      <span className="px-2 py-0.5 rounded-full border border-[#fffef9]/10 bg-[#4a4748]">
                        {course.category}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Footer actions */}
              <div className="px-4 pb-4 flex items-center justify-between gap-2">
                <a
                  href={course.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 flex-1 rounded-md bg-[#6cbe45] text-white px-3 py-2 text-xs font-semibold hover:bg-[#5aa63d] active:scale-[.98] transition"
                >
                  <MessageCircle size={16} />
                  Reservar por WhatsApp
                </a>

                {adminMode && (
                  <button
                    type="button"
                    onClick={() => openEditCourse(course)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#fffef9]/25 px-3 py-2 text-[11px] font-semibold text-[#fffef9]/85 hover:bg-[#4a4748]"
                  >
                    <Edit2 size={14} />
                    Editar
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
      </div>

      {/* CUSTOMER DETAILS MODAL */}
      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}

      {/* ADMIN CRUD MODAL */}
      {editingCourse && (
        <CourseModal
          isNew={isNew}
          course={editingCourse}
          onClose={() => {
            setEditingCourse(null);
            setIsNew(false);
          }}
          onSave={handleSaveCourse}
          onDelete={handleDeleteCourse}
        />
      )}
    </Shell>
  );
}
