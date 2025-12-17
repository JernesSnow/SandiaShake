"use client";

import { useMemo, useState } from "react";
import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";
import {
  User,
  Mail,
  Lock,
  Users,
  Plus,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Database,
  Cloud,
  Bell,
  Gift,
  Award,
} from "react-feather";

/* ------------------ TYPES (TOP LEVEL, NOT INSIDE JSX) ------------------ */

type RolUsuario = "Admin" | "Colaborador" | "Cliente";
type EstadoUsuario = "Activo" | "Suspendido";

type UsuarioSistema = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
};

const initialUsuarios: UsuarioSistema[] = [
  {
    id: "u1",
    nombre: "Jimena Torres",
    correo: "jimena@sandiashake.com",
    rol: "Admin",
    estado: "Activo",
  },
  {
    id: "u2",
    nombre: "Carlos Méndez",
    correo: "carlos@sandiashake.com",
    rol: "Colaborador",
    estado: "Activo",
  },
  {
    id: "u3",
    nombre: "Café La Plaza",
    correo: "cafe@cliente.com",
    rol: "Cliente",
    estado: "Suspendido",
  },
];

/* ------------------ PAGE ------------------ */

export default function ConfiguracionPage() {
  // Perfil
  const [name, setName] = useState("Usuario Admin");
  const [email, setEmail] = useState("admin@sandia.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // CRUD Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>(initialUsuarios);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<RolUsuario | "Todos">(
    "Todos"
  );
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Chilli / Rewards / Notifications
  const [chilliAutoAward, setChilliAutoAward] = useState(true);
  const [chilliPointsOnTime, setChilliPointsOnTime] = useState(10);
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardCatalogVisible, setRewardCatalogVisible] = useState(true);

  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifDueSoon, setNotifDueSoon] = useState(true);
  const [notifMorosidad, setNotifMorosidad] = useState(true);

  // Google Drive
  const [driveEnabled, setDriveEnabled] = useState(true);
  const [driveFolderBase, setDriveFolderBase] = useState(
    "https://drive.google.com/drive/folders/xxxxx"
  );

  // Database
  const [dbProvider, setDbProvider] = useState("Supabase (PostgreSQL)");
  const [dbRealtime, setDbRealtime] = useState(true);
  const [dbRlsEnabled, setDbRlsEnabled] = useState(true);

  // Hosting
  const [hostingProvider, setHostingProvider] = useState("Railway");
  const [envMode, setEnvMode] = useState<"Testing" | "Production">("Testing");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update logic
    console.log("Saving profile...");
  };

  const filteredUsuarios = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    return usuarios.filter((u) => {
      const matchesSearch =
        !s ||
        u.nombre.toLowerCase().includes(s) ||
        u.correo.toLowerCase().includes(s);
      const matchesRole = userRoleFilter === "Todos" || u.rol === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usuarios, userSearch, userRoleFilter]);

  function openNewUser() {
    setIsNewUser(true);
    setEditingUser({
      id: "",
      nombre: "",
      correo: "",
      rol: "Colaborador",
      estado: "Activo",
    });
  }

  function openEditUser(u: UsuarioSistema) {
    setIsNewUser(false);
    setEditingUser(u);
  }

  function saveUser(u: UsuarioSistema) {
    if (!u.nombre.trim() || !u.correo.trim()) {
      alert("Nombre y correo son obligatorios.");
      return;
    }

    // naive email uniqueness check (UI only)
    const emailTaken = usuarios.some(
      (x) => x.correo.toLowerCase() === u.correo.toLowerCase() && x.id !== u.id
    );
    if (emailTaken) {
      alert("Ese correo ya existe.");
      return;
    }

    if (isNewUser) {
      const id = `u${Date.now()}`;
      setUsuarios((prev) => [...prev, { ...u, id }]);
    } else {
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    }

    setEditingUser(null);
    setIsNewUser(false);
  }

  function softDeleteUser(id: string) {
    // delete lógico: suspendemos
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, estado: "Suspendido" } : u))
    );
    setEditingUser(null);
    setIsNewUser(false);
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Configuración</h1>

      {/* ------------------ PERFIL ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Información del Perfil
          </h2>

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

      {/* ------------------ CRUD USUARIOS (ANTES DE DRIVE) ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={18} className="text-[#7dd3fc]" />
                Gestión de usuarios
              </h2>
              <p className="text-[11px] text-gray-400 mt-1">
                Admin principal: crea y administra Admins, Colaboradores y
                Clientes (desactivación lógica).
              </p>
            </div>

            <button
              type="button"
              onClick={openNewUser}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white transition"
            >
              <Plus size={16} /> Nuevo usuario
            </button>
          </div>

          {/* filtros */}
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Buscar por nombre o correo
              </label>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Ej: carlos@sandiashake.com"
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Filtrar por rol
              </label>
              <select
                value={userRoleFilter}
                onChange={(e) =>
                  setUserRoleFilter(e.target.value as RolUsuario | "Todos")
                }
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              >
                <option value="Todos">Todos</option>
                <option value="Admin">Admin</option>
                <option value="Colaborador">Colaborador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
          </div>

          {/* tabla */}
          <div className="overflow-x-auto rounded-lg border border-[#4a4748]/40">
            <table className="w-full text-sm">
              <thead className="bg-[#2b2b30] text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Correo</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-[#333132] text-gray-200">
                {filteredUsuarios.map((u) => (
                  <tr key={u.id} className="border-t border-[#4a4748]/30">
                    <td className="px-4 py-3 whitespace-nowrap">{u.nombre}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                      {u.correo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] border border-[#7dd3fc]/30 bg-[#7dd3fc]/10 text-[#7dd3fc]">
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] border ${
                          u.estado === "Activo"
                            ? "border-[#6cbe45]/40 bg-[#6cbe45]/15 text-[#6cbe45]"
                            : "border-[#ee2346]/40 bg-[#ee2346]/15 text-[#ee2346]"
                        }`}
                      >
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#4a4748]/40 px-2 py-1 text-[12px] text-gray-200 hover:bg-[#3a3738] transition"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => softDeleteUser(u.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-2 py-1 text-[12px] text-[#ee2346] hover:bg-[#ee2346]/15 transition"
                        >
                          <Trash2 size={14} /> Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsuarios.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No hay usuarios que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-lg rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg">
                <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
                  <h3 className="text-white font-semibold">
                    {isNewUser ? "Nuevo usuario" : "Editar usuario"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setIsNewUser(false);
                    }}
                    className="text-xs text-gray-300 hover:text-white"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      Nombre
                    </label>
                    <input
                      value={editingUser.nombre}
                      onChange={(e) =>
                        setEditingUser((p) =>
                          p ? { ...p, nombre: e.target.value } : p
                        )
                      }
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      Correo
                    </label>
                    <input
                      value={editingUser.correo}
                      onChange={(e) =>
                        setEditingUser((p) =>
                          p ? { ...p, correo: e.target.value } : p
                        )
                      }
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        Rol
                      </label>
                      <select
                        value={editingUser.rol}
                        onChange={(e) =>
                          setEditingUser((p) =>
                            p
                              ? { ...p, rol: e.target.value as RolUsuario }
                              : p
                          )
                        }
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Colaborador">Colaborador</option>
                        <option value="Cliente">Cliente</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        Estado
                      </label>
                      <select
                        value={editingUser.estado}
                        onChange={(e) =>
                          setEditingUser((p) =>
                            p
                              ? {
                                  ...p,
                                  estado: e.target.value as EstadoUsuario,
                                }
                              : p
                          )
                        }
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748]/30">
                    {!isNewUser && (
                      <button
                        type="button"
                        onClick={() => softDeleteUser(editingUser.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-3 py-2 text-sm font-semibold text-[#ee2346] hover:bg-[#ee2346]/15 transition"
                      >
                        <Trash2 size={16} /> Desactivar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => saveUser(editingUser)}
                      className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] px-4 py-2 text-sm font-semibold text-white transition"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------ CHILLI POINTS / REWARDS / NOTIFICACIONES ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-[#ee2346]" />
            Chilli Points, premios y notificaciones
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Chilli points */}
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Gift size={16} className="text-[#ee2346]" />
                Chilli Points
              </h3>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chilliAutoAward}
                  onChange={(e) => setChilliAutoAward(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Otorgación automática por entregas puntuales
              </label>

              <div className="mt-3">
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Puntos por entrega puntual
                </label>
                <input
                  type="number"
                  min={0}
                  value={chilliPointsOnTime}
                  onChange={(e) => setChilliPointsOnTime(Number(e.target.value))}
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                />
                <p className="text-[11px] text-gray-400 mt-2">
                  Recomendación: 5–15 por entregable según dificultad.
                </p>
              </div>
            </div>

            {/* Rewards */}
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Gift size={16} className="text-[#7dd3fc]" />
                Premios
              </h3>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rewardEnabled}
                  onChange={(e) => setRewardEnabled(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Habilitar canje de premios
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={rewardCatalogVisible}
                  onChange={(e) => setRewardCatalogVisible(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Mostrar catálogo de premios a colaboradores
              </label>

              <p className="text-[11px] text-gray-400 mt-3">
                El CRUD del catálogo de premios puede ir en el módulo de
                “Configuración” o “Colaboradores”.
              </p>
            </div>

            {/* Notifications */}
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4 md:col-span-2">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Bell size={16} className="text-[#6cbe45]" />
                Notificaciones
              </h3>

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifDailyDigest}
                    onChange={(e) => setNotifDailyDigest(e.target.checked)}
                    className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                  />
                  Resumen diario
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifDueSoon}
                    onChange={(e) => setNotifDueSoon(e.target.checked)}
                    className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                  />
                  Alertas por vencimiento
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifMorosidad}
                    onChange={(e) => setNotifMorosidad(e.target.checked)}
                    className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                  />
                  Morosidad / bloqueo
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => alert("Guardar configuraciones (pendiente)")}
              className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
            >
              Guardar configuraciones
            </button>
          </div>
        </div>
      </div>

      {/* ------------------ GOOGLE DRIVE ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LinkIcon size={18} className="text-[#7dd3fc]" />
            Google Drive
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={driveEnabled}
                  onChange={(e) => setDriveEnabled(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Habilitar integración con Google Drive
              </label>

              <p className="text-[11px] text-gray-400 mt-2">
                Si está deshabilitado, no se mostrará el link del folder en tareas/entregables.
              </p>
            </div>

            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Carpeta base (link)
              </label>
              <input
                type="url"
                value={driveFolderBase}
                onChange={(e) => setDriveFolderBase(e.target.value)}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => alert("Guardar Google Drive (pendiente)")}
              className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
            >
              Guardar Google Drive
            </button>
          </div>
        </div>
      </div>

      {/* ------------------ DATABASE ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-[#6cbe45]" />
            Base de datos
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Proveedor
              </label>
              <input
                value={dbProvider}
                onChange={(e) => setDbProvider(e.target.value)}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Recomendado: Supabase (PostgreSQL) por Auth + RLS + escalabilidad.
              </p>
            </div>

            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dbRealtime}
                  onChange={(e) => setDbRealtime(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Realtime habilitado
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dbRlsEnabled}
                  onChange={(e) => setDbRlsEnabled(e.target.checked)}
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Row Level Security (RLS) habilitado
              </label>

              <p className="text-[11px] text-gray-400">
                RLS: asegura que cada rol solo vea lo permitido (mínimo privilegio).
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => alert("Guardar DB (pendiente)")}
              className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
            >
              Guardar base de datos
            </button>
          </div>
        </div>
      </div>

      {/* ------------------ HOSTING ------------------ */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cloud size={18} className="text-[#7dd3fc]" />
            Hosting
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Proveedor
              </label>
              <input
                value={hostingProvider}
                onChange={(e) => setHostingProvider(e.target.value)}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Sugerido: Railway para test y prod con despliegue por ramas.
              </p>
            </div>

            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Entorno activo
              </label>
              <select
                value={envMode}
                onChange={(e) => setEnvMode(e.target.value as "Testing" | "Production")}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              >
                <option value="Testing">Testing</option>
                <option value="Production">Production</option>
              </select>

              <p className="text-[11px] text-gray-400 mt-2">
                Testing: rama de pruebas · Production: rama main.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => alert("Guardar hosting (pendiente)")}
              className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
            >
              Guardar hosting
            </button>
          </div>
        </div>
      </div>

    </Shell>
  );
}
