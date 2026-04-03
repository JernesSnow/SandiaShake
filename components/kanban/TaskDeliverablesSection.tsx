"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Trash2, FileText } from "react-feather";

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE";

type Deliverable = {
  id_entregable: number;
  version_num?: number;
  drive_file_name?: string;
  drive_file_id?: string;
  estado_aprobacion?: "PENDIENTE" | "APROBADO" | "RECHAZADO";
};

type Props = {
  taskId: string;
  googleDriveUrl?: string;
  role: Role;
};

function extractFolderId(url?: string) {
  if (!url) return null;
  const match = url.match(/folders\/([^/?]+)/);
  return match ? match[1] : null;
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function TaskDeliverablesSection({
  taskId,
  googleDriveUrl,
  role,
}: Props) {
  const [files, setFiles] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const folderId = extractFolderId(googleDriveUrl);

  const canUpload = role === "ADMIN" || role === "COLABORADOR";
  const canDelete = role === "ADMIN" || role === "COLABORADOR";
  const canApprove = role === "CLIENTE";

  /* -------------------------
     Load Deliverables
  ------------------------- */

  async function loadFiles() {
    try {
      const res = await fetch(`/api/admin/tareas/${taskId}/entregables`, {
        cache: "no-store",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        console.error("Load files error:", json);
        return;
      }

      // FIX: match your API response format
      const list = Array.isArray(json?.data) ? json.data : [];

      setFiles(list);
    } catch (err) {
      console.error("File load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, [taskId]);

  /* -------------------------
     Upload Handler
  ------------------------- */

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {

      if (!canUpload) return;

      if (uploading) return;

      if (!folderId || !googleDriveUrl) {
        console.error("Drive folder not configured for this task");
        alert("Drive folder not configured.");
        return;
      }

      setUploading(true);

      try {
        for (const file of acceptedFiles) {

          /* upload to Drive */

          const form = new FormData();
          form.append("file", file);
          form.append("tareaId", taskId);
          form.append("folderId", folderId);

          const uploadRes = await fetch("/api/google-drive/upload", {
            method: "POST",
            body: form,
          });

          const driveData = await safeJson(uploadRes);

          if (!uploadRes.ok || !driveData?.fileId) {
            console.error("Drive upload failed:", driveData);
            continue;
          }

          /* register version */

          const registerRes = await fetch(
            `/api/admin/tareas/${taskId}/entregables`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                drive_file_id: driveData.fileId,
                drive_file_name: driveData.name ?? file.name,
                drive_mime_type: driveData.mimeType ?? file.type,
                drive_file_size: driveData.size ?? file.size,
                drive_folder_url: googleDriveUrl, // guaranteed non-null
              }),
            }
          );

          if (!registerRes.ok) {
            const err = await safeJson(registerRes);
            console.error("Register deliverable failed:", err);
          }
        }

        await loadFiles();
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    },
    [taskId, folderId, canUpload, googleDriveUrl, uploading]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: !canUpload || uploading,
  });

  /* -------------------------
     Delete Deliverable
  ------------------------- */

  async function deleteFile(id: number) {
    if (!canDelete) return;

    const res = await fetch(`/api/admin/entregables/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      console.error("Delete failed");
      return;
    }

    setFiles((prev) => prev.filter((f) => f.id_entregable !== id));
  }

  /* -------------------------
     UI
  ------------------------- */

  return (
    <div className="space-y-4">

      {/* Upload Zone */}

      {canUpload && (
        <div
          {...getRootProps()}
          className={`border border-dashed border-[var(--ss-border)] rounded-xl p-6 text-center transition ${
            isDragActive
              ? "bg-[var(--ss-raised)]"
              : "bg-[var(--ss-raised)] hover:bg-[var(--ss-raised)]"
          }`}
        >
          <input {...getInputProps()} />

          <UploadCloud size={28} className="mx-auto mb-2 text-[var(--ss-text2)]" />

          <p className="text-sm text-[var(--ss-text2)]">Arrastre los archivos aquí</p>

          <button
            type="button"
            onClick={open}
            className="mt-3 px-3 py-2 bg-[#6cbe45] text-black rounded-xl text-sm"
          >
            Seleccionar archivos
          </button>

          {uploading && (
            <p className="text-xs text-[#6cbe45] mt-2">Cargando...</p>
          )}
        </div>
      )}

      {/* File List */}

      {loading ? (
        <p className="text-sm text-[var(--ss-text3)]">Cargando archivos...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-[var(--ss-text3)]">
          No se ha realizado ningún entregable.
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const name = file.drive_file_name ?? "file";

            return (
              <div
                key={file.id_entregable}
                className="flex items-center justify-between bg-[var(--ss-raised)] border border-[var(--ss-border)] rounded-xl px-3 py-2"
              >
                <button
                    onClick={() => setPreviewFileId(file.drive_file_id!)}
                    className="flex items-center gap-2 text-sm text-[var(--ss-text2)] hover:text-[var(--ss-text)]"
                    >
                    <FileText size={14} />
                    <span>
                        {file.version_num && (
                        <span className="text-xs text-[#6cbe45] mr-2">
                            v{file.version_num}
                        </span>
                        )}
                        {name}
                    </span>
                </button>

                <div className="flex items-center gap-2">

                  {canDelete && (
                    <button
                      onClick={() => deleteFile(file.id_entregable)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewFileId && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onClick={() => setPreviewFileId(null)}
        >
            <div
            className="bg-black rounded-xl overflow-hidden border border-[var(--ss-border)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            >
            <iframe
                src={`https://drive.google.com/file/d/${previewFileId}/preview`}
                className="max-w-[90vw] max-h-[90vh] w-[900px] h-[600px]"
                allow="autoplay"
            />
            </div>
        </div>
        )}
    </div>
  );
}