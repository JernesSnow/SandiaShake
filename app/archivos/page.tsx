"use client";

import { useEffect, useState, useCallback } from "react";
import { Shell } from "../../components/Shell";
import {
  Folder,
  File,
  Image,
  Film,
  FileText,
  Loader,
  RefreshCw,
  ChevronRight,
  X,
} from "react-feather";

const TARGET_FOLDER = "SandiaShake";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
};

type Breadcrumb = { id: string; name: string };

function isFolder(mime: string) {
  return mime === "application/vnd.google-apps.folder";
}

function isPreviewable(mime: string) {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

function mimeIcon(mime: string) {
  if (isFolder(mime)) return <Folder size={18} className="text-[#7dd3fc]" />;
  if (mime.startsWith("image/"))
    return <Image size={18} className="text-[#6cbe45]" />;
  if (mime.startsWith("video/"))
    return <Film size={18} className="text-[#ee2346]" />;
  if (
    mime.includes("document") ||
    mime.includes("text") ||
    mime.includes("pdf") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation")
  )
    return <FileText size={18} className="text-[#f59e0b]" />;
  return <File size={18} className="text-gray-400" />;
}

function formatSize(bytes: string | null) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (isNaN(n) || n === 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string) {
  if (isFolder(mime)) return "Carpeta";
  if (mime.startsWith("image/")) return "Imagen";
  if (mime.startsWith("video/")) return "Video";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("spreadsheet") || mime.includes("sheet"))
    return "Hoja de cálculo";
  if (mime.includes("document") || mime.includes("doc")) return "Documento";
  if (mime.includes("presentation") || mime.includes("slide"))
    return "Presentación";
  if (mime.startsWith("text/")) return "Texto";
  return mime.split("/").pop() ?? "Archivo";
}

export default function ArchivosPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DriveFile | null>(null);

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    setFiles([]);

    try {
      const res = await fetch(
        `/api/google-drive/files?folderId=${encodeURIComponent(folderId)}`
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al listar archivos.");
        return;
      }

      setFiles(json.files ?? []);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: find root folder, then list its contents
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFiles([]);
    setBreadcrumbs([]);
    setCurrentFolderId(null);

    try {
      const folderRes = await fetch(
        `/api/google-drive/find-folder?name=${encodeURIComponent(TARGET_FOLDER)}`
      );
      const folderJson = await folderRes.json();

      if (!folderRes.ok) {
        setError(folderJson.error ?? "No se encontró la carpeta.");
        return;
      }

      const rootId = folderJson.id;
      setCurrentFolderId(rootId);
      setBreadcrumbs([{ id: rootId, name: TARGET_FOLDER }]);

      await loadFolder(rootId);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }, [loadFolder]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function navigateToFolder(folder: DriveFile) {
    const newId = folder.id;
    setCurrentFolderId(newId);
    setBreadcrumbs((prev) => [...prev, { id: newId, name: folder.name }]);
    loadFolder(newId);
  }

  function navigateToBreadcrumb(index: number) {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadFolder(target.id);
  }

  function handleRowClick(file: DriveFile) {
    if (isFolder(file.mimeType)) {
      navigateToFolder(file);
    } else if (isPreviewable(file.mimeType)) {
      setPreview(file);
    }
  }

  function isClickable(mime: string) {
    return isFolder(mime) || isPreviewable(mime);
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Archivos</h1>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-[#3a3738] disabled:opacity-50 transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Recargar
        </button>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-4 text-sm text-gray-400 flex-wrap">
          {breadcrumbs.map((bc, i) => (
            <span key={bc.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="text-gray-500" />}
              {i < breadcrumbs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => navigateToBreadcrumb(i)}
                  className="hover:text-white transition"
                >
                  {bc.name}
                </button>
              ) : (
                <span className="text-gray-200 font-medium">{bc.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {error && (
        <div className="rounded-xl border border-[#ee2346]/40 bg-[#ee2346]/10 p-4 mb-6">
          <p className="text-sm text-[#ee2346]">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader size={24} className="animate-spin mr-3" />
          <span className="text-sm">Cargando archivos...</span>
        </div>
      )}

      {!loading && !error && files.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Folder size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Esta carpeta está vacía.</p>
        </div>
      )}

      {!loading && files.length > 0 && (
        <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#2b2b30] text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Tamaño</th>
                </tr>
              </thead>
              <tbody className="bg-[#333132] text-gray-200">
                {files.map((f) => {
                  const clickable = isClickable(f.mimeType);
                  return (
                    <tr
                      key={f.id}
                      onClick={clickable ? () => handleRowClick(f) : undefined}
                      className={`border-t border-[#4a4748]/30 ${
                        clickable
                          ? "cursor-pointer hover:bg-[#3a3738] transition"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {mimeIcon(f.mimeType)}
                          <span className="truncate max-w-xs">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                        {mimeLabel(f.mimeType)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-400">
                        {formatSize(f.size)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-5xl w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4">
              <h2 className="text-white text-sm font-medium truncate pr-4">
                {preview.name}
              </h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            {preview.mimeType.startsWith("image/") && (
              <img
                src={`/api/google-drive/file/${preview.id}`}
                alt={preview.name}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
            )}

            {preview.mimeType.startsWith("video/") && (
              <video
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-lg"
              >
                <source
                  src={`/api/google-drive/file/${preview.id}`}
                  type={preview.mimeType}
                />
                Tu navegador no soporta la reproducción de video.
              </video>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
