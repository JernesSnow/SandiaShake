"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { User, Mail, Shield, Save, Tag } from "react-feather";
import { createSupabaseClient } from "@/lib/supabase/client";

type RolUsuario = "ADMIN" | "COLABORADOR" | "CLIENTE";

type PerfilUsuario = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
};

export default function MiPerfilPage() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseClient(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: perfilData } = await supabase
        .from("usuarios")
        .select("id_usuario,nombre,correo,rol")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (!perfilData || perfilData.rol === "ADMIN") return;

      const { data: tagsData } = await supabase
        .from("usuario_tags")
        .select("tag")
        .eq("id_usuario", perfilData.id_usuario)
        .eq("estado", "ACTIVO");

      setPerfil(perfilData);
      setTags(tagsData?.map(t => t.tag) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  async function savePerfil() {
    if (!perfil) return;
    setSaving(true);

    const supabase = createSupabaseClient(true);

    await supabase
      .from("usuarios")
      .update({ nombre: perfil.nombre })
      .eq("id_usuario", perfil.id_usuario);

    setSaving(false);
  }

  if (loading || !perfil) {
    return (
      <Shell>
        <p className="text-gray-400">Cargando perfil…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#ee2346]/20 flex items-center justify-center">
            <User className="text-[#ee2346]" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-white">
              {perfil.nombre}
            </h1>
            <p className="text-sm text-gray-400">{perfil.correo}</p>
            <span className="inline-flex mt-1 rounded-full bg-[#ee2346]/15 text-[#ee2346] px-2 py-0.5 text-[11px]">
              {perfil.rol}
            </span>
          </div>
        </div>
      </div>

      {/* Editable info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Shield size={16} /> Información básica
          </h2>

          <div>
            <label className="text-xs text-gray-400">Nombre</label>
            <input
              value={perfil.nombre}
              onChange={(e) =>
                setPerfil({ ...perfil, nombre: e.target.value })
              }
              className="mt-1 w-full rounded-md bg-[#2b2a2b] border border-[#4a4748]/40 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Correo</label>
            <input
              disabled
              value={perfil.correo}
              className="mt-1 w-full rounded-md bg-[#242323] border border-[#4a4748]/40 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>

          <button
            onClick={savePerfil}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#ee2346] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d81f3f]"
          >
            <Save size={14} />
            Guardar cambios
          </button>
        </div>

        {/* Tags */}
        <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Tag size={16} /> Etiquetas
          </h2>

          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#ee2346]/15 text-[#ee2346] px-3 py-1 text-[12px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No tienes etiquetas asignadas.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
