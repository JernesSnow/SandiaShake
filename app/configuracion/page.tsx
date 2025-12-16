"use client";

import { useState } from "react";
import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";
import { User, Mail, Lock } from "react-feather";

export default function ConfiguracionPage() {
  const [name, setName] = useState("Usuario Admin");
  const [email, setEmail] = useState("admin@sandia.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update logic
    console.log("Saving profile...");
  };

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Configuración</h1>

      {/* Profile Management Section */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Información del Perfil</h2>

          <form onSubmit={handleSaveProfile}>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <User size={16} />
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                  placeholder="Tu nombre completo"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Mail size={16} />
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Password Change Section */}
            <div className="mt-8 pt-6 border-t border-[#3a3a40]">
              <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                <Lock size={18} />
                Cambiar contraseña
              </h3>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Current Password */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                    placeholder="••••••••"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                    placeholder="••••••••"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
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

      {/* Existing Section Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Mi perfil" />
        <SectionCard title="Preferencias de notificación" />
        <SectionCard title="Integraciones (Google Drive, pasarela de pago)" />
        <SectionCard title="Parámetros del sistema" />
      </div>
    </Shell>
  );
}
