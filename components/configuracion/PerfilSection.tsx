"use client";

import { Eye, EyeOff, User, Mail, Lock } from "react-feather";
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

    if (!name.trim()) { setMessage("El nombre no puede estar vacío."); return; }
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
        body: JSON.stringify({ nombre: name.trim(), currentPassword: currentPassword || undefined, newPassword: newPassword || undefined, confirmPassword: confirmPassword || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(json.message || "Error al actualizar el perfil."); return; }
      setMessage(wantsPasswordChange ? "Contraseña actualizada." : "Perfil actualizado.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { setMessage("Error inesperado."); }
    finally { setSaving(false); }
  };

  const fields = [
    { label: "Contraseña actual",   val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(s => !s) },
    { label: "Nueva contraseña",    val: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(s => !s)     },
    { label: "Confirmar contraseña",val: confirmPassword,  set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(s => !s) },
  ];

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 mb-5">
      <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
        <User size={16} className="text-[#6cbe45]" /> Información del perfil
      </h2>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5">
              <User size={12} /> Nombre completo
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5">
              <Mail size={12} /> Correo electrónico
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--ss-border)]">
          <h3 className="text-sm font-semibold text-[var(--ss-text)] mb-4 flex items-center gap-2">
            <Lock size={14} /> Cambiar contraseña
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {fields.map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">{f.label}</label>
                <div className="relative">
                  <input type={f.show ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)} className={inputCls + " pr-10"} />
                  <button type="button" onClick={f.toggle} className="absolute inset-y-0 right-0 px-3 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                    {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-2.5 text-xs border ${message.includes("actualiz") ? "bg-[#6cbe45]/10 border-[#6cbe45]/30 text-[#6cbe45]" : "bg-[#ee2346]/10 border-[#ee2346]/25 text-[#ee2346]"}`}>
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
