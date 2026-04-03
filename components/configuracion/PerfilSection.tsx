"use client";

import { Eye, EyeOff, User, Mail, Lock, Edit2, Check, X } from "react-feather";
import { useMemo, useState } from "react";

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

type Props = {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
};

export default function PerfilSection({ name, email, setName, setEmail }: Props) {
  /* ── nombre editing ── */
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName]     = useState("");
  const [confirmName, setConfirmName] = useState(false);

  function startEditName() { setDraftName(name); setEditingName(true); setConfirmName(false); }
  function cancelEditName() { setEditingName(false); setConfirmName(false); }
  function requestConfirmName() {
    if (!draftName.trim() || draftName.trim() === name) { cancelEditName(); return; }
    setConfirmName(true);
  }
  function applyNameChange() { setName(draftName.trim()); setEditingName(false); setConfirmName(false); }

  /* ── password ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  const wantsPasswordChange = useMemo(
    () => !!(currentPassword || newPassword || confirmPassword),
    [currentPassword, newPassword, confirmPassword]
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) { setMessage("Completá todos los campos de contraseña."); return; }
      if (newPassword.length < 8) { setMessage("La nueva contraseña debe tener al menos 8 caracteres."); return; }
      if (newPassword !== confirmPassword) { setMessage("Las contraseñas no coinciden."); return; }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/mi-perfil", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: name.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(json.message || "Error al actualizar el perfil."); return; }
      setMessage(wantsPasswordChange ? "Contraseña actualizada." : "Perfil actualizado.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { setMessage("Error inesperado."); }
    finally { setSaving(false); }
  };

  const pwFields = [
    { label: "Contraseña actual",    val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(s => !s) },
    { label: "Nueva contraseña",     val: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(s => !s)     },
    { label: "Confirmar contraseña", val: confirmPassword,  set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(s => !s) },
  ];

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 mb-5">
      <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
        <User size={16} className="text-[#6cbe45]" /> Información del perfil
      </h2>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5">
              <User size={12} /> Nombre completo
            </label>

            {!editingName ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text)]">
                  {name || <span className="text-[var(--ss-text3)]">—</span>}
                </div>
                <button
                  type="button"
                  onClick={startEditName}
                  className="shrink-0 p-2 rounded-xl border border-[var(--ss-border)] text-[var(--ss-text3)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-overlay)] transition"
                  title="Editar nombre"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ) : confirmName ? (
              /* Confirm step */
              <div className="rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 p-3 space-y-2">
                <p className="text-xs text-[#facc15] font-medium">¿Cambiar nombre a <span className="font-bold">"{draftName.trim()}"</span>?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyNameChange}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#6cbe45] hover:bg-[#5aa63d] px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    <Check size={12} /> Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditName}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--ss-border)] px-3 py-1.5 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
                  >
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Edit step */
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  autoFocus
                  className={inputCls + " flex-1"}
                />
                <button
                  type="button"
                  onClick={requestConfirmName}
                  className="shrink-0 p-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] text-white transition"
                  title="Guardar"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={cancelEditName}
                  className="shrink-0 p-2 rounded-xl border border-[var(--ss-border)] text-[var(--ss-text3)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-overlay)] transition"
                  title="Cancelar"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5">
              <Mail size={12} /> Correo electrónico
            </label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text2)]">
              <span className="flex-1 truncate">{email}</span>
              <span className="shrink-0 text-[10px] text-[var(--ss-text3)] bg-[var(--ss-overlay)] px-2 py-0.5 rounded-full">Solo lectura</span>
            </div>
          </div>

        </div>

        {/* Password */}
        <div className="pt-4 border-t border-[var(--ss-border)]">
          <h3 className="text-sm font-semibold text-[var(--ss-text)] mb-4 flex items-center gap-2">
            <Lock size={14} /> Cambiar contraseña
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {pwFields.map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">{f.label}</label>
                <div className="relative">
                  <input
                    type={f.show ? "text" : "password"}
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    className={inputCls + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={f.toggle}
                    className="absolute inset-y-0 right-0 px-3 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition"
                  >
                    {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-2.5 text-xs border ${
            message.includes("actualiz")
              ? "bg-[#6cbe45]/10 border-[#6cbe45]/30 text-[#6cbe45]"
              : "bg-[#ee2346]/10 border-[#ee2346]/25 text-[#ee2346]"
          }`}>
            {message}
          </div>
        )}

        {wantsPasswordChange && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              {saving ? "Guardando…" : "Guardar contraseña"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
