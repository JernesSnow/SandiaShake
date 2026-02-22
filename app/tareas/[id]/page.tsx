"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import {
  ArrowLeft,
  Folder,
  File as FileIcon,
  Image,
  Film,
  FileText,
  Loader,
  UploadCloud,
  Calendar,
  Tag,
  Layers,
  X,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "react-feather";

type Task = {
  id_tarea: number;
  titulo: string;
  descripcion?: string;
  status_kanban: string;
  prioridad: string;
  tipo_entregable: string;
  fecha_entrega?: string;
  mes?: string;
  id_factura?: number | null;
  created_at?: string;
  googleDriveUrl?: string | null;
};

type CurrentUser = {
  id_usuario: number;
  rol: "ADMIN" | "COLABORADOR" | "CLIENTE";
};

type Entregable = {
  id_entregable: number;
  id_tarea: number;
  version_num: number;
  estado_aprobacion: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  drive_file_id: string | null;
  drive_file_name: string | null;
  drive_mime_type: string | null;
  drive_file_size: number | null;
  created_at?: string;
};

function extractFolderId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/folders\/([^/?]+)/);
  return match ? match[1] : null;
}

function isFolder(mime: string) {
  return mime === "application/vnd.google-apps.folder";
}

function isPreviewable(mime: string) {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

function mimeIcon(mime: string) {
  if (isFolder(mime)) return <Folder size={18} className="text-sky-400" />;
  if (mime.startsWith("image/"))
    return <Image size={18} className="text-green-400" />;
  if (mime.startsWith("video/"))
    return <Film size={18} className="text-red-400" />;
  if (
    mime.includes("document") ||
    mime.includes("pdf") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("text")
  )
    return <FileText size={18} className="text-amber-400" />;
  return <FileIcon size={18} className="text-gray-400" />;
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (isNaN(n) || n === 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityColor(priority: string) {
  if (priority === "Alta") return "bg-red-500/20 text-red-400";
  if (priority === "Media") return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
}

function statusColor(status: string) {
  if (status === "en_progreso") return "bg-blue-500/20 text-blue-400";
  if (status === "en_revision") return "bg-purple-500/20 text-purple-400";
  if (status === "aprobada") return "bg-green-500/20 text-green-400";
  if (status === "rechazada") return "bg-red-500/20 text-red-400";
  if (status === "archivada") return "bg-gray-500/20 text-gray-400";
  return "bg-yellow-500/20 text-yellow-400";
}

function approvalChip(estado: Entregable["estado_aprobacion"]) {
  if (estado === "APROBADO")
    return "bg-green-500/15 text-green-400 border border-green-500/25";
  if (estado === "RECHAZADO")
    return "bg-red-500/15 text-red-400 border border-red-500/25";
  return "bg-purple-500/15 text-purple-300 border border-purple-500/25";
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);

  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [loadingEntregables, setLoadingEntregables] = useState(false);

  const [preview, setPreview] = useState<Entregable | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedForDecision, setSelectedForDecision] =
    useState<Entregable | null>(null);


  const [comentario, setComentario] = useState("");
  const [aprobando, setAprobando] = useState(false);
  const [errorAprobacion, setErrorAprobacion] = useState<string | null>(null);

  const canApprove = me?.rol === "CLIENTE";

  const folderId = useMemo(() => {
    return extractFolderId(task?.googleDriveUrl ?? null);
  }, [task?.googleDriveUrl]);

  
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const json = await res.json();
        if (json?.ok && json?.data?.id_usuario && json?.data?.rol) {
          setMe(json.data);
        }
      } finally {
        setLoadingMe(false);
      }
    }
    loadMe();
  }, []);


  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/admin/tareas/${id}`);
        const json = await res.json();
        if (res.ok) setTask(json.data);
      } finally {
        setLoadingTask(false);
      }
    }
    if (id) fetchTask();
  }, [id]);


  const loadEntregables = useCallback(async () => {
    if (!id) return;
    setLoadingEntregables(true);
    try {
      const res = await fetch(`/api/admin/tareas/${id}/entregables`);
      const json = await res.json();
      if (res.ok) setEntregables(json.data ?? []);
      else setEntregables([]);
    } finally {
      setLoadingEntregables(false);
    }
  }, [id]);

  useEffect(() => {
    loadEntregables();
  }, [loadEntregables]);

  async function uploadFile(file: File, folderId: string) {
    if (!task) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", folderId);
    formData.append("tareaId", String(task.id_tarea));

    const res = await fetch("/api/google-drive/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("Upload failed");
      return;
    }

    await loadEntregables();

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error ?? "Error subiendo archivo");
      return;
    }

    await loadEntregables();
  }

  async function handleDecision(decision: "APROBADO" | "RECHAZADO") {
    if (!selectedForDecision) return;

    if (!comentario.trim()) {
      setErrorAprobacion("Debe ingresar un comentario.");
      return;
    }

    setErrorAprobacion(null);
    setAprobando(true);

    try {
      const res = await fetch(`/api/admin/tareas/${id}/aprobacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_entregable: selectedForDecision.id_entregable,
          decision,
          comentario,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "No fue posible procesar la aprobación.");
      }

      setComentario("");
      setSelectedForDecision(null);
      await loadEntregables();
    } catch (err: any) {
      setErrorAprobacion(err?.message ?? "Error");
    } finally {
      setAprobando(false);
    }
  }

  const enRevision = useMemo(
    () => entregables.filter((e) => e.estado_aprobacion === "PENDIENTE"),
    [entregables]
  );
  const aprobadas = useMemo(
    () => entregables.filter((e) => e.estado_aprobacion === "APROBADO"),
    [entregables]
  );
  const rechazadas = useMemo(
    () => entregables.filter((e) => e.estado_aprobacion === "RECHAZADO"),
    [entregables]
  );

  if (loadingTask) {
    return (
      <Shell>
        <p className="text-sm text-white/60">Cargando tarea...</p>
      </Shell>
    );
  }

  if (!task) {
    return (
      <Shell>
        <p className="text-sm text-red-400">Tarea no encontrada.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        {/* TASK CARD */}
        <div className="bg-[#1e1e1e] rounded-xl p-8 border border-white/10 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">{task.titulo}</h1>

            <div className="flex gap-3 flex-wrap justify-end">
              <span
                className={`px-3 py-1 text-xs rounded-full ${statusColor(
                  task.status_kanban
                )}`}
              >
                {task.status_kanban.replace("_", " ")}
              </span>

              <span
                className={`px-3 py-1 text-xs rounded-full ${priorityColor(
                  task.prioridad
                )}`}
              >
                {task.prioridad}
              </span>
            </div>
          </div>

          {task.descripcion && (
            <p className="text-sm text-white/70 whitespace-pre-line">
              {task.descripcion}
            </p>
          )}

          <div className="grid md:grid-cols-4 gap-6 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Tag size={14} />
              Tipo: {task.tipo_entregable}
            </div>

            {task.mes && (
              <div className="flex items-center gap-2">
                <Layers size={14} />
                Mes: {task.mes}
              </div>
            )}

            {task.fecha_entrega && (
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                Entrega: {new Date(task.fecha_entrega).toLocaleDateString()}
              </div>
            )}

            {task.id_factura && <div>Factura #{task.id_factura}</div>}
          </div>
        </div>

        {/* UPLOAD / DROPZONE */}
        {folderId && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);

              const droppedFiles = Array.from(e.dataTransfer.files);
              for (const f of droppedFiles) {
                await uploadFile(f, folderId);
              }
            }}
            className={`relative rounded-xl border-2 border-dashed transition p-8 ${
              isDragging
                ? "border-blue-400 bg-blue-500/10"
                : "border-white/20 bg-[#1e1e1e]"
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <UploadCloud size={34} className="text-blue-400 mb-2" />
              <p className="text-sm font-semibold text-white">
                Arrastra y suelta archivos aquí
              </p>
              <p className="text-xs text-white/50 mt-1">
                Cada archivo se registra como una nueva versión para aprobación
              </p>
            </div>
          </div>
        )}

        {/* APPROVAL PIPELINE */}
        <div className="space-y-8">
          {/* EN REVISION */}
          <div className="bg-[#1e1e1e] rounded-xl border border-purple-500/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-purple-300">
                En revisión ({enRevision.length})
              </h2>

              {loadingEntregables && (
                <div className="flex items-center text-xs text-white/50">
                  <Loader size={14} className="animate-spin mr-2" />
                  Actualizando...
                </div>
              )}
            </div>

            <div className="p-6">
              {enRevision.length === 0 ? (
                <p className="text-sm text-white/50">
                  No hay archivos en revisión.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="text-left py-2">Archivo</th>
                        <th className="text-left py-2">Versión</th>
                        <th className="text-right py-2">Tamaño</th>
                        <th className="text-right py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enRevision.map((e) => {
                        const mime = e.drive_mime_type ?? "";
                        return (
                          <tr
                            key={e.id_entregable}
                            className="border-t border-white/10"
                          >
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => setPreview(e)}
                                className="flex items-center gap-2 hover:text-white transition text-left"
                              >
                                {mimeIcon(mime)}
                                <span className="truncate max-w-[360px]">
                                  {e.drive_file_name ?? "Archivo"}
                                </span>
                                <span
                                  className={`ml-2 px-2 py-0.5 text-[11px] rounded-full ${approvalChip(
                                    e.estado_aprobacion
                                  )}`}
                                >
                                  PENDIENTE
                                </span>
                              </button>
                            </td>

                            <td className="py-3 text-white/60">
                              v{e.version_num}
                            </td>

                            <td className="py-3 text-right text-white/50">
                              {formatSize(e.drive_file_size)}
                            </td>

                            <td className="py-3 text-right">
                              {canApprove ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedForDecision(e)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30 transition"
                                >
                                  <MessageSquare size={14} />
                                  Revisar
                                </button>
                              ) : (
                                <span className="text-xs text-white/40">
                                  Solo clientes pueden aprobar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Decision box (CLIENTE) */}
              {selectedForDecision && (
                <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Aprobación (v{selectedForDecision.version_num})
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {selectedForDecision.drive_file_name ?? "Archivo"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForDecision(null);
                        setComentario("");
                        setErrorAprobacion(null);
                      }}
                      className="text-white/50 hover:text-white transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <textarea
                    value={comentario}
                    onChange={(ev) => setComentario(ev.target.value)}
                    placeholder="Escribe tu comentario de retroalimentación..."
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-purple-500"
                    rows={4}
                  />

                  {errorAprobacion && (
                    <p className="text-sm text-red-400">{errorAprobacion}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      disabled={aprobando || !canApprove}
                      onClick={() => handleDecision("APROBADO")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      Aprobar
                    </button>

                    <button
                      disabled={aprobando || !canApprove}
                      onClick={() => handleDecision("RECHAZADO")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-medium transition disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Rechazar
                    </button>
                  </div>

                  {loadingMe && (
                    <p className="text-xs text-white/40">
                      Cargando usuario...
                    </p>
                  )}
                  {!loadingMe && !me && (
                    <p className="text-xs text-amber-300/80">
                      No se pudo detectar el usuario actual. Si no existe{" "}
                      <span className="font-mono">/api/auth/me</span>, la UI no
                      puede habilitar la aprobación (pero el pipeline igual se
                      ve).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* APROBADAS */}
          <div className="bg-[#1e1e1e] rounded-xl border border-green-500/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-green-500/30 bg-green-500/5">
              <h2 className="text-sm font-semibold text-green-300">
                Aprobadas ({aprobadas.length})
              </h2>
            </div>

            <div className="p-6">
              {aprobadas.length === 0 ? (
                <p className="text-sm text-white/50">
                  No hay aprobaciones registradas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="text-left py-2">Archivo</th>
                        <th className="text-left py-2">Versión</th>
                        <th className="text-right py-2">Tamaño</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aprobadas.map((e) => {
                        const mime = e.drive_mime_type ?? "";
                        return (
                          <tr
                            key={e.id_entregable}
                            className="border-t border-white/10"
                          >
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => setPreview(e)}
                                className="flex items-center gap-2 hover:text-white transition text-left"
                              >
                                {mimeIcon(mime)}
                                <span className="truncate max-w-[420px]">
                                  {e.drive_file_name ?? "Archivo"}
                                </span>
                                <span
                                  className={`ml-2 px-2 py-0.5 text-[11px] rounded-full ${approvalChip(
                                    e.estado_aprobacion
                                  )}`}
                                >
                                  APROBADO
                                </span>
                              </button>
                            </td>
                            <td className="py-3 text-white/60">
                              v{e.version_num}
                            </td>
                            <td className="py-3 text-right text-white/50">
                              {formatSize(e.drive_file_size)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RECHAZADAS */}
          <div className="bg-[#1e1e1e] rounded-xl border border-red-500/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-500/30 bg-red-500/5">
              <h2 className="text-sm font-semibold text-red-300">
                Rechazadas ({rechazadas.length})
              </h2>
            </div>

            <div className="p-6">
              {rechazadas.length === 0 ? (
                <p className="text-sm text-white/50">
                  No hay rechazos registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="text-left py-2">Archivo</th>
                        <th className="text-left py-2">Versión</th>
                        <th className="text-right py-2">Tamaño</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rechazadas.map((e) => {
                        const mime = e.drive_mime_type ?? "";
                        return (
                          <tr
                            key={e.id_entregable}
                            className="border-t border-white/10"
                          >
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => setPreview(e)}
                                className="flex items-center gap-2 hover:text-white transition text-left"
                              >
                                {mimeIcon(mime)}
                                <span className="truncate max-w-[420px]">
                                  {e.drive_file_name ?? "Archivo"}
                                </span>
                                <span
                                  className={`ml-2 px-2 py-0.5 text-[11px] rounded-full ${approvalChip(
                                    e.estado_aprobacion
                                  )}`}
                                >
                                  RECHAZADO
                                </span>
                              </button>
                            </td>
                            <td className="py-3 text-white/60">
                              v{e.version_num}
                            </td>
                            <td className="py-3 text-right text-white/50">
                              {formatSize(e.drive_file_size)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PREVIEW MODAL (image/video only; otherwise opens download link) */}
        {preview && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setPreview(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full mx-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-white truncate pr-4">
                  {preview.drive_file_name ?? "Archivo"}
                </div>
                <button
                  className="text-white/50 hover:text-white transition"
                  onClick={() => setPreview(null)}
                >
                  <X size={22} />
                </button>
              </div>

              {preview.drive_mime_type?.startsWith("image/") && (
                <img
                  src={`/api/google-drive/file/${preview.drive_file_id}`}
                  alt={preview.drive_file_name ?? "preview"}
                  className="max-h-[80vh] max-w-full object-contain rounded-lg"
                />
              )}

              {preview.drive_mime_type?.startsWith("video/") && (
                <video controls autoPlay className="max-h-[80vh] w-full rounded-lg">
                  <source
                    src={`/api/google-drive/file/${preview.drive_file_id}`}
                    type={preview.drive_mime_type ?? "video/mp4"}
                  />
                </video>
              )}

              {!preview.drive_mime_type?.startsWith("image/") &&
                !preview.drive_mime_type?.startsWith("video/") && (
                  <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-6 text-sm text-white/70">
                    Este archivo no se puede previsualizar aquí.
                    <div className="mt-3">
                      <a
                        className="underline text-white hover:text-white/80"
                        href={`/api/google-drive/file/${preview.drive_file_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir/descargar archivo
                      </a>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}