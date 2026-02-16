"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "../../components/Shell";
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
  CheckCircle,
} from "react-feather";



/* ------------------ TYPES (UI) ------------------ */

type RolUsuario = "Admin" | "Colaborador" | "Cliente";
type EstadoUsuario = "Activo" | "Suspendido";

type UsuarioSistema = {
  id: string; // id_usuario bigint -> string
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  adminNivel?: "PRIMARIO" | "SECUNDARIO" | null;
};

/* ------------------ MAPPERS DB <-> UI ------------------ */

function rolDbToUi(rol: string): RolUsuario {
  const r = (rol ?? "").toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "COLABORADOR") return "Colaborador";
  return "Cliente";
}

function rolUiToDb(rol: RolUsuario) {
  if (rol === "Admin") return "ADMIN";
  if (rol === "Colaborador") return "COLABORADOR";
  return "CLIENTE";
}

function estadoDbToUi(estado: string): EstadoUsuario {
  const e = (estado ?? "").toUpperCase();
  return e === "ACTIVO" ? "Activo" : "Suspendido";
}

function estadoUiToDb(estado: EstadoUsuario) {
  return estado === "Activo" ? "ACTIVO" : "INACTIVO";
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export default function ConfiguracionPage() {
  const router = useRouter();

  // Perfil (placeholder)
  const [name, setName] = useState("Usuario Admin");
  const [email, setEmail] = useState("admin@sandia.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // CRUD Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<RolUsuario | "Todos">("Todos");
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [noAutenticado, setNoAutenticado] = useState(false);

  // Chilli / Rewards / Notifications
  const [chilliAutoAward, setChilliAutoAward] = useState(true);
  const [chilliPointsOnTime, setChilliPointsOnTime] = useState(10);
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardCatalogVisible, setRewardCatalogVisible] = useState(true);

  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifDueSoon, setNotifDueSoon] = useState(true);
  const [notifMorosidad, setNotifMorosidad] = useState(true);

  // Google Drive
  const [driveConnected, setDriveConnected] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check query param from OAuth callback
    if (searchParams.get("drive") === "connected") {
      setDriveConnected(true);
    }
    // Also verify with server
    fetch("/api/google-drive/status")
      .then((r) => r.json())
      .then((d) => setDriveConnected(d.connected))
      .catch(() => {});
  }, [searchParams]);

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

  async function cargarUsuarios() {
    setCargandoUsuarios(true);
    setErrorUsuarios(null);
    setNoAutenticado(false);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const text = await res.text();
      const json = safeJsonParse(text);

      if (res.status === 401) {
        setNoAutenticado(true);
        setUsuarios([]);
        setErrorUsuarios(json?.error ?? "No autenticado.");
        return;
      }

      if (!res.ok) {
        setUsuarios([]);
        setErrorUsuarios(json?.error ?? "No se pudieron cargar los usuarios.");
        return;
      }

      const lista: UsuarioSistema[] = (json?.usuarios ?? []).map((u: any) => ({
        id: String(u.id_usuario), // ✅ important
        nombre: u.nombre ?? "",
        correo: u.correo ?? "",
        rol: rolDbToUi(u.rol),
        estado: estadoDbToUi(u.estado),
        adminNivel: u.admin_nivel ?? null,
      }));

      setUsuarios(lista);
    } catch {
      setUsuarios([]);
      setErrorUsuarios("Error cargando usuarios.");
    } finally {
      setCargandoUsuarios(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const filteredUsuarios = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    return usuarios.filter((u) => {
      const matchesSearch =
        !s || u.nombre.toLowerCase().includes(s) || u.correo.toLowerCase().includes(s);
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
      adminNivel: "SECUNDARIO",
    });
  }

  function openEditUser(u: UsuarioSistema) {
    setIsNewUser(false);
    setEditingUser({ ...u }); // ✅ copy
  }

  async function saveUser(u: UsuarioSistema) {
    if (!u.nombre.trim() || !u.correo.trim()) {
      alert("Nombre y correo son obligatorios.");
      return;
    }

    if (isNewUser) {
      if (u.rol === "Cliente") {
        alert("Para crear Clientes es mejor un flujo separado (cliente + cliente_usuario).");
        return;
      }

      const res = await fetch("/api/admin/crear-usuario", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nombre: u.nombre,
          correo: u.correo,
          rol: rolUiToDb(u.rol),
          admin_nivel: u.rol === "Admin" ? (u.adminNivel ?? "SECUNDARIO") : null,
        }),
      });

      const text = await res.text();
      const json = safeJsonParse(text);

      if (res.status === 401) {
        setNoAutenticado(true);
        alert(json?.error ?? "No autenticado.");
        return;
      }
      if (!res.ok) {
        alert(json?.error ?? "No se pudo crear el usuario.");
        return;
      }

      await cargarUsuarios();
      setEditingUser(null);
      setIsNewUser(false);
      return;
    }

    // EDITAR: requiere id
    if (!u.id || !/^\d+$/.test(u.id)) {
      alert("ID inválido");
      return;
    }

    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        nombre: u.nombre,
        correo: u.correo,
        rol: rolUiToDb(u.rol),
        admin_nivel: u.rol === "Admin" ? (u.adminNivel ?? "SECUNDARIO") : null,
        estado: estadoUiToDb(u.estado),
      }),
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (res.status === 401) {
      setNoAutenticado(true);
      alert(json?.error ?? "No autenticado.");
      return;
    }
    if (!res.ok) {
      alert(json?.error ?? "No se pudo actualizar el usuario.");
      return;
    }

    await cargarUsuarios();
    setEditingUser(null);
    setIsNewUser(false);
  }

  async function softDeleteUser(id: string) {
    if (!id || !/^\d+$/.test(id)) {
      alert("ID inválido");
      return;
    }

    const res = await fetch(`/api/admin/usuarios/${id}/desactivar`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (res.status === 401) {
      setNoAutenticado(true);
      alert(json?.error ?? "No autenticado.");
      return;
    }
    if (!res.ok) {
      alert(json?.error ?? "No se pudo desactivar.");
      return;
    }

    await cargarUsuarios();
    setEditingUser(null);
    setIsNewUser(false);
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Guardar perfil (pendiente).");
  };

 

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Configuración</h1>

      {/* PERFIL */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Información del Perfil</h2>

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
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
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
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
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
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                  />
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

      {/* CRUD USUARIOS */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={18} className="text-[#7dd3fc]" />
                Gestión de usuarios
              </h2>
              <p className="text-[11px] text-gray-400 mt-1">
                Lista desde <span className="text-gray-200">/api/admin/usuarios</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cargarUsuarios}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold border border-[#4a4748]/40 text-gray-200 hover:bg-[#3a3738] transition"
              >
                Recargar
              </button>

              <button
                type="button"
                onClick={openNewUser}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white transition"
              >
                <Plus size={16} /> Nuevo usuario
              </button>
            </div>
          </div>

          {cargandoUsuarios && <p className="text-sm text-gray-300 mb-3">Cargando usuarios...</p>}

          {errorUsuarios && (
            <div className="mb-3">
              <p className="text-sm text-red-400">{errorUsuarios}</p>
              {noAutenticado && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/auth")}
                    className="px-3 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
                  >
                    Ir a iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={cargarUsuarios}
                    className="px-3 py-2 rounded-md border border-[#4a4748]/40 text-gray-200 hover:bg-[#3a3738] text-sm font-semibold transition"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}

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
              <label className="text-sm font-medium text-gray-400 mb-2 block">Filtrar por rol</label>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as RolUsuario | "Todos")}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              >
                <option value="Todos">Todos</option>
                <option value="Admin">Admin</option>
                <option value="Colaborador">Colaborador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
          </div>

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
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">{u.correo}</td>
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

                {!cargandoUsuarios && filteredUsuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No hay usuarios que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Nombre</label>
                    <input
                      value={editingUser.nombre}
                      onChange={(e) =>
                        setEditingUser((p) => (p ? { ...p, nombre: e.target.value } : p))
                      }
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Correo</label>
                    <input
                      value={editingUser.correo}
                      onChange={(e) =>
                        setEditingUser((p) => (p ? { ...p, correo: e.target.value } : p))
                      }
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Rol</label>
                      <select
                        value={editingUser.rol}
                        onChange={(e) =>
                          setEditingUser((p) =>
                            p ? { ...p, rol: e.target.value as RolUsuario } : p
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
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Estado</label>
                      <select
                        value={editingUser.estado}
                        onChange={(e) =>
                          setEditingUser((p) =>
                            p ? { ...p, estado: e.target.value as EstadoUsuario } : p
                          )
                        }
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </div>
                  </div>

                  {editingUser.rol === "Admin" && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        Nivel de Admin
                      </label>
                      <select
                        value={editingUser.adminNivel ?? "SECUNDARIO"}
                        onChange={(e) =>
                          setEditingUser((p) =>
                            p
                              ? { ...p, adminNivel: e.target.value as "PRIMARIO" | "SECUNDARIO" }
                              : p
                          )
                        }
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                      >
                        <option value="PRIMARIO">PRIMARIO</option>
                        <option value="SECUNDARIO">SECUNDARIO</option>
                      </select>
                    </div>
                  )}

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

                  {isNewUser && (
                    <p className="text-[11px] text-gray-400">
                      Para Admin/Colaborador se crea mediante tu endpoint. Para Cliente, se recomienda un flujo
                      separado.
                    </p>
                  )}
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

          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            {driveConnected ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={20} className="text-[#6cbe45]" />
                  <span className="text-sm font-semibold text-[#6cbe45]">Google Drive conectado</span>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Tu cuenta de Google está vinculada. Puedes explorar tus archivos desde la sección
                  <a href="/archivos" className="text-[#7dd3fc] hover:underline ml-1">Archivos</a>.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.href = "/api/oauth2/connect"}
                  className="inline-flex items-center gap-2 rounded-md border border-[#4a4748]/40 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#3a3738] transition"
                >
                  Reconectar con otra cuenta
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  Conecta tu cuenta de Google para almacenar archivos de tareas directamente en tu Drive.
                  Se crearán carpetas automáticas por organización y por tarea.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.href = "/api/oauth2/connect"}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow hover:bg-gray-100 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Conectar Google Drive
                </button>
              </>
            )}
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
