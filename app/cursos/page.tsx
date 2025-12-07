"use client";

import { useState } from "react";
import { Shell } from "../../components/Shell";

type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  link: string;
};

const INITIAL_COURSES: Course[] = [
  {
    id: "curso-ig-basico",
    title: "Instagram Básico para PYMEs",
    subtitle: "Nivel introductorio",
    description:
      "Aprendé a configurar tu cuenta, optimizar tu biografía y publicar contenido básico para tu negocio.",
    imageUrl:
      "https://imgs.search.brave.com/sYf6-TMahoaANlwUl1jQLgLFe450gm2L_FafgMhrD0M/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZS5qaW1jZG4uY29t/L2FwcC9jbXMvaW1h/Z2UvdHJhbnNmL2Rp/bWVuc2lvbj00NTV4/MTAyNDpmb3JtYXQ9/anBnL3BhdGgvc2Iw/MGU4MjUwMzI3Y2Qw/YTEvaW1hZ2UvaTZk/NzA3MjgzODM2NDc1/NmUvdmVyc2lvbi8x/NzQ5MDM5NzYzL2N1/cnNvLWRlLWdlc3Rp/JUMzJUIzbi1kZS1w/eW1lcy5qcGc", // 🔗 CAMBIÁ ESTO
    link: "#",
  },
  {
    id: "curso-calendario",
    title: "Calendario de Contenidos 101",
    subtitle: "Planificación mensual",
    description:
      "Diseñá un calendario de contenidos estratégico y alineado a los objetivos de tu marca.",
    imageUrl:
      "https://imgs.search.brave.com/eICsbeWRVpBaoGTkDf_aUAnczCYY1wiuc5gkhukyFOA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/Zm90b3MtcHJlbWl1/bS8yZG8tZGlhLW1l/cy10ZXh0by1lc2Ny/aXRvLW1hbm8tZW50/cmVuYW1pZW50by1k/aWJ1amFuZG8tbGlu/ZWEtZmVjaGEtY2Fs/ZW5kYXJpb18yOTU4/OTAtNjMwOS5qcGc_/c2VtdD1haXNfaHli/cmlk", // 🔗 CAMBIÁ ESTO
    link: "#",
  },
  {
    id: "curso-ads",
    title: "Meta Ads para Principiantes",
    subtitle: "Campañas pagadas",
    description:
      "Creá tus primeras campañas, definí audiencias y entendé las métricas clave de rendimiento.",
    imageUrl:
      "https://imgs.search.brave.com/bggZ6qYfytFCOhDhGvwR8zzdxKOxnAajg5crgz7-zkc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/bGVtb25hZGVzY2hv/b2wuY29tLmJyL3dw/LWNvbnRlbnQvdXBs/b2Fkcy8yMDIyLzA1/LzkzM3g1MjUtMzMu/anBn", // 🔗 CAMBIÁ ESTO
    link: "#",
  },
];

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isNew, setIsNew] = useState(false);

  function openNewCourse() {
    setIsNew(true);
    setEditingCourse({
      id: "",
      title: "",
      subtitle: "",
      description: "",
      imageUrl: "",
      link: "",
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
    if (!input.title.trim()) {
      alert("El curso debe tener un título.");
      return;
    }

    if (isNew) {
      const id = input.id || `curso-${Date.now()}`;
      const newCourse: Course = { ...input, id };
      setCourses((prev) => [...prev, newCourse]);
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
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#fffef9]">
              Cursos
            </h1>
            <p className="text-sm text-[#fffef9]/70 mt-1">
              Administrá el catálogo de cursos disponibles para clientes de
              SandíaShake.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <button
              type="button"
              onClick={openNewCourse}
              className="inline-flex items-center justify-center rounded-md bg-[#ee2346] text-[#fffef9] px-4 py-2 text-xs md:text-sm font-medium shadow-sm hover:bg-[#d8203f] active:scale-[.98]"
            >
              + Nuevo curso
            </button>
          </div>
        </header>

        {/* Cards grid */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="
                flex flex-col overflow-hidden rounded-xl 
                bg-[#3d3b3c] border border-[#fffef9]/10 
                shadow-sm hover:shadow-md transition-shadow
              "
            >
              {/* Imagen */}
              <div className="relative w-full aspect-video overflow-hidden bg-[#4a4748]">
                <img
                  src={course.imageUrl || "https://via.placeholder.com/600x350?text=Curso"}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Body */}
              <div className="flex-1 p-4 flex flex-col gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#fffef9]">
                    {course.title || "Curso sin título"}
                  </h2>
                  {course.subtitle && (
                    <p className="text-xs text-[#fffef9]/60">
                      {course.subtitle}
                    </p>
                  )}
                </div>

                {course.description && (
                  <p className="text-xs text-[#fffef9]/75 leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 flex items-center justify-between gap-2">
                <a
                  href={course.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    inline-flex items-center justify-center flex-1
                    rounded-md bg-[#6cbe45] text-[#fffef9] 
                    px-3 py-2 text-xs font-medium
                    hover:bg-[#5aa63d] active:scale-[.98] transition
                  "
                >
                  Ver curso
                </a>

                <button
                  type="button"
                  onClick={() => openEditCourse(course)}
                  className="
                    inline-flex items-center justify-center
                    rounded-md border border-[#fffef9]/25 
                    px-3 py-2 text-[11px] font-medium
                    text-[#fffef9]/80 hover:bg-[#4a4748]
                  "
                >
                  Editar
                </button>
              </div>
            </article>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full text-center text-sm text-[#fffef9]/60 py-10">
              No hay cursos aún. Hacé clic en{" "}
              <span className="font-semibold text-[#fffef9]">
                “Nuevo curso”
              </span>{" "}
              para agregar el primero.
            </div>
          )}
        </section>
      </div>

      {/* Modal CRUD */}
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

/* -------------------------
   MODAL COMPONENT
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
    if (!form.title.trim()) {
      alert("El curso debe tener un título.");
      return;
    }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto bg-[#333132] border border-[#fffef9]/10">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#fffef9]/10 bg-[#3d3b3c] rounded-t-xl flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#fffef9]">
            {isNew ? "Nuevo curso" : "Editar curso"}
          </h2>
          <button
            type="button"
            className="text-xs text-[#fffef9]/70 hover:text-[#fffef9]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
                ID (opcional, solo si querés uno específico)
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
                className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70 min-h-[90px]"
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
                URL de la imagen
              </label>
              <input
                type="url"
                className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                placeholder="https://tusitio.com/curso.jpg"
                value={form.imageUrl}
                onChange={(e) =>
                  updateField("imageUrl", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#fffef9]/80 mb-1">
                Link del curso
              </label>
              <input
                type="url"
                className="w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9] border border-[#fffef9]/15 outline-none focus:ring-2 focus:ring-[#ee2346]/70"
                placeholder="https://..."
                value={form.link}
                onChange={(e) => updateField("link", e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#fffef9]/10 bg-[#3d3b3c] rounded-b-xl mt-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="inline-flex items-center gap-1 text-xs text-[#ee2346] hover:text-[#d8203f]"
              >
                Eliminar
              </button>
            )}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[#fffef9]/20 px-3 py-1.5 text-xs text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#ee2346] text-[#fffef9] px-3 py-1.5 text-xs font-semibold hover:bg-[#d8203f]"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
