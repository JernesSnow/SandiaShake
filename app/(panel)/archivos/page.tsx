"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Folder, File, Image as ImageIcon, Film, FileText,
  Loader, RefreshCw, ChevronRight, X, List, Grid, Layout, Search,
} from "react-feather";

type ViewMode = "list" | "icons" | "gallery";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
};

type Breadcrumb = { id: string; name: string };

const TARGET_FOLDER = "SandiaConChile";

function isFolder(mime: string)      { return mime === "application/vnd.google-apps.folder"; }
function isImage(mime: string)       { return mime.startsWith("image/"); }
function isVideo(mime: string)       { return mime.startsWith("video/"); }
function isPreviewable(mime: string) { return isImage(mime) || isVideo(mime); }
function isClickable(mime: string)   { return isFolder(mime) || isPreviewable(mime); }

function mimeLabel(mime: string) {
  if (isFolder(mime))   return "Carpeta";
  if (isImage(mime))    return "Imagen";
  if (isVideo(mime))    return "Video";
  if (mime.includes("pdf"))           return "PDF";
  if (mime.includes("spreadsheet") || mime.includes("sheet")) return "Hoja de cálculo";
  if (mime.includes("document")    || mime.includes("doc"))   return "Documento";
  if (mime.includes("presentation") || mime.includes("slide"))return "Presentación";
  if (mime.startsWith("text/"))       return "Texto";
  return mime.split("/").pop() ?? "Archivo";
}

function formatSize(bytes: string | null) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (isNaN(n) || n === 0) return "—";
  if (n < 1024)        return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime, size = 18 }: { mime: string; size?: number }) {
  if (isFolder(mime))  return <Folder   size={size} className="text-[#7dd3fc]" />;
  if (isImage(mime))   return <ImageIcon size={size} className="text-[#6cbe45]" />;
  if (isVideo(mime))   return <Film     size={size} className="text-[#ee2346]" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text") || mime.includes("spreadsheet") || mime.includes("presentation"))
    return <FileText size={size} className="text-[#f59e0b]" />;
  return <File size={size} className="text-[var(--ss-text3)]" />;
}

/* ── View toggle button ── */
function ViewBtn({ mode, current, onClick, title, children }: { mode: ViewMode; current: ViewMode; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition ${current === mode ? "bg-[var(--ss-overlay)] text-[var(--ss-text)]" : "text-[var(--ss-text3)] hover:text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)]"}`}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════ */

export default function ArchivosPage() {
  const [files, setFiles]               = useState<DriveFile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs]   = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [preview, setPreview]           = useState<DriveFile | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>("list");
  const [search, setSearch]             = useState("");

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true); setError(null); setFiles([]);
    try {
      const res  = await fetch(`/api/google-drive/files?folderId=${encodeURIComponent(folderId)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al listar archivos."); return; }
      setFiles(json.files ?? []);
    } catch { setError("No se pudo conectar con el servidor."); }
    finally { setLoading(false); }
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null); setFiles([]); setBreadcrumbs([]); setCurrentFolderId(null);
    try {
      const res  = await fetch("/api/google-drive/root-folder");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "No se encontró la carpeta."); setLoading(false); return; }
      const rootId = json.id;
      setCurrentFolderId(rootId);
      setBreadcrumbs([{ id: rootId, name: TARGET_FOLDER }]);
      await loadFolder(rootId);
    } catch { setError("No se pudo conectar con el servidor."); setLoading(false); }
  }, [loadFolder]);

  useEffect(() => { cargar(); }, [cargar]);

  function navigateToFolder(folder: DriveFile) {
    setSearch("");
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    loadFolder(folder.id);
  }

  function navigateToBreadcrumb(index: number) {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    loadFolder(target.id);
  }

  function handleFileClick(file: DriveFile) {
    if (isFolder(file.mimeType))       navigateToFolder(file);
    else if (isPreviewable(file.mimeType)) setPreview(file);
  }

  /* ── filtered + separated lists for display ── */
  const q = search.trim().toLowerCase();
  const filtered   = q ? files.filter(f => f.name.toLowerCase().includes(q)) : files;
  const folders    = filtered.filter(f => isFolder(f.mimeType));
  const nonFolders = filtered.filter(f => !isFolder(f.mimeType));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ss-text)]">Archivos</h1>
          <p className="text-xs text-[var(--ss-text3)] mt-0.5">Google Drive · {TARGET_FOLDER}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ss-text3)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar archivos…"
              className="pl-8 pr-8 py-2 rounded-xl text-sm bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text)] placeholder:text-[var(--ss-text3)] outline-none focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition w-48"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                <X size={13} />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-0.5">
            <ViewBtn mode="list"    current={viewMode} onClick={() => setViewMode("list")}    title="Vista lista">   <List   size={15} /></ViewBtn>
            <ViewBtn mode="icons"   current={viewMode} onClick={() => setViewMode("icons")}   title="Vista íconos">  <Grid   size={15} /></ViewBtn>
            <ViewBtn mode="gallery" current={viewMode} onClick={() => setViewMode("gallery")} title="Vista galería"> <Layout size={15} /></ViewBtn>
          </div>

          <button type="button" onClick={cargar} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--ss-border)] px-3 py-2 text-xs font-medium text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] disabled:opacity-50 transition">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recargar
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-4 text-xs text-[var(--ss-text3)] flex-wrap">
          {breadcrumbs.map((bc, i) => (
            <span key={bc.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} />}
              {i < breadcrumbs.length - 1 ? (
                <button type="button" onClick={() => navigateToBreadcrumb(i)} className="hover:text-[var(--ss-text)] transition underline underline-offset-2">
                  {bc.name}
                </button>
              ) : (
                <span className="text-[var(--ss-text2)] font-medium">{bc.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[#ee2346]/30 bg-[#ee2346]/10 px-4 py-3 mb-5">
          <p className="text-sm text-[#ee2346]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[var(--ss-text3)]">
          <Loader size={22} className="animate-spin mr-3" />
          <span className="text-sm">Cargando archivos…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && files.length === 0 && (
        <div className="text-center py-16 text-[var(--ss-text3)]">
          <Folder size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Esta carpeta está vacía.</p>
        </div>
      )}
      {!loading && !error && files.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--ss-text3)]">
          <Search size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Sin resultados para <span className="text-[var(--ss-text2)] font-medium">"{search}"</span>.</p>
        </div>
      )}

      {/* ══ LIST VIEW ══ */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--ss-raised)] text-[var(--ss-text3)] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Tamaño</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const clickable = isClickable(f.mimeType);
                  return (
                    <tr
                      key={f.id}
                      onClick={clickable ? () => handleFileClick(f) : undefined}
                      className={`border-t border-[var(--ss-border)] transition ${clickable ? "cursor-pointer hover:bg-[var(--ss-overlay)]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileIcon mime={f.mimeType} size={16} />
                          <span className="truncate max-w-xs text-[var(--ss-text)]">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--ss-text3)] text-xs hidden sm:table-cell">{mimeLabel(f.mimeType)}</td>
                      <td className="px-4 py-3 text-[var(--ss-text3)] text-xs text-right hidden md:table-cell">{formatSize(f.size)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ICONS VIEW ══ */}
      {!loading && filtered.length > 0 && viewMode === "icons" && (
        <div className="space-y-4">
          {folders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-text3)] mb-2">Carpetas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {folders.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFileClick(f)}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] p-4 hover:border-[#7dd3fc]/50 hover:bg-[var(--ss-overlay)] transition group text-center"
                  >
                    <Folder size={36} className="text-[#7dd3fc] group-hover:scale-105 transition-transform" />
                    <span className="text-xs text-[var(--ss-text2)] truncate w-full">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nonFolders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-text3)] mb-2">Archivos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {nonFolders.map(f => {
                  const clickable = isPreviewable(f.mimeType);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={clickable ? () => handleFileClick(f) : undefined}
                      disabled={!clickable}
                      className={`flex flex-col items-center gap-2 rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] p-4 text-center transition ${clickable ? "hover:bg-[var(--ss-overlay)] hover:border-[#6cbe45]/40 cursor-pointer group" : "opacity-70 cursor-default"}`}
                    >
                      <FileIcon mime={f.mimeType} size={36} />
                      <span className="text-xs text-[var(--ss-text2)] truncate w-full">{f.name}</span>
                      <span className="text-[10px] text-[var(--ss-text3)]">{formatSize(f.size)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ GALLERY VIEW ══ */}
      {!loading && filtered.length > 0 && viewMode === "gallery" && (
        <div className="space-y-4">
          {folders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-text3)] mb-2">Carpetas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {folders.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFileClick(f)}
                    className="flex flex-col rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] overflow-hidden hover:border-[#7dd3fc]/50 hover:shadow-md transition group"
                  >
                    <div className="aspect-video bg-[var(--ss-raised)] flex items-center justify-center">
                      <Folder size={40} className="text-[#7dd3fc] group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs text-[var(--ss-text2)] truncate font-medium">{f.name}</p>
                      <p className="text-[10px] text-[var(--ss-text3)]">Carpeta</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nonFolders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-text3)] mb-2">Archivos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {nonFolders.map(f => {
                  const clickable = isPreviewable(f.mimeType);
                  const isImg     = isImage(f.mimeType);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={clickable ? () => handleFileClick(f) : undefined}
                      disabled={!clickable}
                      className={`flex flex-col rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] overflow-hidden transition ${clickable ? "hover:border-[#6cbe45]/40 hover:shadow-md cursor-pointer group" : "opacity-60 cursor-default"}`}
                    >
                      <div className="aspect-video bg-[var(--ss-raised)] flex items-center justify-center overflow-hidden">
                        {isImg ? (
                          <img
                            src={`/api/google-drive/file/${f.id}`}
                            alt={f.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <FileIcon mime={f.mimeType} size={40} />
                        )}
                      </div>
                      <div className="px-3 py-2 text-left">
                        <p className="text-xs text-[var(--ss-text2)] truncate font-medium">{f.name}</p>
                        <p className="text-[10px] text-[var(--ss-text3)]">{mimeLabel(f.mimeType)} · {formatSize(f.size)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="relative max-w-5xl w-full mx-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-3">
              <div>
                <p className="text-white text-sm font-medium truncate pr-4">{preview.name}</p>
                <p className="text-white/50 text-xs">{mimeLabel(preview.mimeType)} · {formatSize(preview.size)}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="text-white/60 hover:text-white transition p-2 rounded-xl hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            {isImage(preview.mimeType) && (
              <img src={`/api/google-drive/file/${preview.id}`} alt={preview.name} className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl" />
            )}
            {isVideo(preview.mimeType) && (
              <video controls autoPlay className="max-h-[80vh] max-w-full rounded-xl shadow-2xl">
                <source src={`/api/google-drive/file/${preview.id}`} type={preview.mimeType} />
                Tu navegador no soporta la reproducción de video.
              </video>
            )}
          </div>
        </div>
      )}
    </>
  );
}
