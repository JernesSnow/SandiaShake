"use client";

import { Eye, EyeOff, User, Mail, Lock } from "react-feather";
import { useState } from "react";

type Props = {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
};

export default function PerfilSection({
  name,
  email,
  setName,
  setEmail,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch("/api/mi-perfil", {
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

    alert("Perfil actualizado correctamente");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">
          Información del Perfil
        </h2>

        <form onSubmit={handleSaveProfile}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                <User size={16} />
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                <Mail size={16} />
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#3a3a40]">
            <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <Lock size={18} />
              Cambiar contraseña
            </h3>

            <div className="grid gap-6 md:grid-cols-3">
         
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

          
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
