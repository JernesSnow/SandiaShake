"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Save, MapPin, Mail, Phone } from "react-feather";
import { createSupabaseClient } from "@/lib/supabase/client";

type Organizacion = {
  id_organizacion: number;
  nombre: string;
  pais: string | null;
  ciudad: string | null;
  canton: string | null;
  telefono: string | null;
  correo: string | null;
  descripcion: string | null;
};

export default function MiOrganizacionPage() {
  const [org, setOrg] = useState<Organizacion | null>(null);
  const [form, setForm] = useState<Partial<Organizacion>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizacion();
  }, []);

  async function loadOrganizacion() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient(true);

      // 1️⃣ Auth user
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("No autenticado");

      // 2️⃣ Usuario interno
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_usuario, rol")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (!usuario) throw new Error("Usuario no encontrado");
      if (usuario.rol === "ADMIN") throw new Error("Admins no usan esta vista");

      // 3️⃣ Organización asociada
      const { data: rel } = await supabase
        .from("organizacion_usuario")
        .select("id_organizacion")
        .eq("id_usuario_cliente", usuario.id_usuario)
        .maybeSingle();

      if (!rel) throw new Error("No hay organización asociada");

      // 4️⃣ Organización
      const { data: organizacion } = await supabase
        .from("organizaciones")
        .select(`
          id_organizacion,
          nombre,
          pais,
          ciudad,
          canton,
          telefono,
          correo,
          descripcion
        `)
        .eq("id_organizacion", rel.id_organizacion)
        .maybeSingle();

      if (!organizacion) throw new Error("Organización no encontrada");

      setOrg(organizacion);
      setForm(organizacion);
    } catch (e: any) {
      setError(e.message ?? "Error cargando organización");
    } finally {
      setLoading(false);
    }
  }

  async function saveChanges() {
    if (!org) return;
    setSaving(true);

    try {
      const supabase = createSupabaseClient(true);

      const { error } = await supabase
        .from("organizaciones")
        .update({
          nombre: form.nombre,
          pais: form.pais,
          ciudad: form.ciudad,
          canton: form.canton,
          telefono: form.telefono,
          correo: form.correo,
          descripcion: form.descripcion,
        })
        .eq("id_organizacion", org.id_organizacion);

      if (error) throw error;

      setOrg({ ...org, ...form } as Organizacion);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">
        Mi organización
      </h1>

      {loading && (
        <p className="text-sm text-gray-300">Cargando organización…</p>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {org && (
        <div className="max-w-3xl bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow">
          {/* Cover */}
          <div className="h-28 bg-gradient-to-r from-[#ee2346]/40 to-[#6cbe45]/40 rounded-t-xl" />

          {/* Profile */}
          <div className="p-6 -mt-10 space-y-5">
            <div className="bg-[#262425] w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border border-[#4a4748]">
              {org.nombre.charAt(0)}
            </div>

            <input
              className="w-full bg-[#262425] border border-[#4a4748] rounded-md px-3 py-2 text-white text-lg font-semibold"
              value={form.nombre ?? ""}
              onChange={(e) =>
                setForm({ ...form, nombre: e.target.value })
              }
            />

            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <input
                  className="bg-transparent border-b border-[#4a4748] flex-1 outline-none"
                  value={form.correo ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, correo: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Phone size={14} />
                <input
                  className="bg-transparent border-b border-[#4a4748] flex-1 outline-none"
                  value={form.telefono ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <input
                  className="bg-transparent border-b border-[#4a4748] flex-1 outline-none"
                  placeholder="País"
                  value={form.pais ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, pais: e.target.value })
                  }
                />
              </div>

              <input
                className="bg-transparent border-b border-[#4a4748] outline-none"
                placeholder="Ciudad"
                value={form.ciudad ?? ""}
                onChange={(e) =>
                  setForm({ ...form, ciudad: e.target.value })
                }
              />
            </div>

            <textarea
              className="w-full bg-[#262425] border border-[#4a4748] rounded-md px-3 py-2 text-sm text-gray-200"
              rows={4}
              placeholder="Descripción de la organización"
              value={form.descripcion ?? ""}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
            />

            <button
              onClick={saveChanges}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#6cbe45] text-black px-4 py-2 rounded-md font-semibold hover:opacity-90 transition"
            >
              <Save size={14} />
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
