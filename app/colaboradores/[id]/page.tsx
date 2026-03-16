"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Gift, CheckCircle } from "react-feather";

type Premio = {
  id_premio: number;
  nombre: string;
  descripcion: string;
  puntos_costo: number;
};

type Redencion = {
  id_canje: number;
  premio_nombre: string;
  puntos_usados: number;
  fecha_canje: string;
  estado: "ACTIVO" | "INACTIVO";
};

type Colaborador = {
  id: string;
  nombre: string;
  email: string;
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  chilliPoints: number;
};

export default function ColaboradorDetail() {
  const params = useParams();
  const id = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string | undefined);

  const [perfil, setPerfil] = useState<Colaborador | null>(null);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [redenciones, setRedenciones] = useState<Redencion[]>([]);
  const [canjeando, setCanjeando] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function safeJson(res: Response) {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  async function cargarTodo() {
    if (!id) return;

    try {
      setLoading(true);

      const [colabRes, premiosRes, redencionesRes] = await Promise.all([
        fetch("/api/admin/colaboradores", { cache: "no-store" }),
        fetch("/api/admin/premios", { cache: "no-store" }),
        fetch(`/api/rewards/redemptions?id_colaborador=${id}`, {
          cache: "no-store",
        }),
      ]);

      /* ---------- COLABORADOR ---------- */

      if (colabRes.ok) {
        const json = await safeJson(colabRes);

        const usuario = (json.colaboradores ?? []).find(
          (u: any) => String(u.id_usuario) === String(id)
        );

        if (usuario) {
          setPerfil({
            id: String(usuario.id_usuario),
            nombre: usuario.nombre,
            email: usuario.correo,
            totalTareas: usuario.totalTareas ?? 0,
            tareasPendientes: usuario.tareasPendientes ?? 0,
            tareasAprobadas: usuario.tareasAprobadas ?? 0,
            chilliPoints: usuario.chilliPoints ?? 0,
          });
        } else {
          setPerfil(null);
        }
      }

      /* ---------- PREMIOS ---------- */

      if (premiosRes.ok) {
        const jPremios = await safeJson(premiosRes);
        setPremios(jPremios.premios ?? []);
      }

      /* ---------- REDENCIONES ---------- */

      if (redencionesRes.ok) {
        const j = await safeJson(redencionesRes);
        setRedenciones(j.redenciones ?? []);
      }

    } catch (err) {
      console.error("Error cargando colaborador:", err);
      setPerfil(null);
      setPremios([]);
      setRedenciones([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    cargarTodo();
  }, [id]);

  async function canjearPremio(idPremio: number) {
    if (!id) return;

    try {
      setCanjeando(idPremio);

      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_colaborador: Number(id),
          id_premio: idPremio,
        }),
      });

      if (!res.ok) {
        const j = await safeJson(res);
        alert(j?.error ?? "No se pudo canjear el premio");
        return;
      }

      alert("Premio canjeado 🎉");
      await cargarTodo();
    } catch (err) {
      console.error("Redeem error:", err);
      alert("Ocurrió un error al intentar canjear el premio");
    } finally {
      setCanjeando(null);
    }
  }

  async function marcarUsado(id_canje: number) {
    const res = await fetch("/api/rewards/use", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_canje }),
    });

    if (!res.ok) {
      alert("No se pudo marcar como usado");
      return;
    }

    await cargarTodo();
  }

  if (loading) {
    return (
      <Shell>
        <div className="text-[#fffef9]/60">Cargando colaborador...</div>
      </Shell>
    );
  }

  if (!perfil) {
    return (
      <Shell>
        <div className="text-[#fffef9]/60">
          No se pudo cargar el colaborador
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-8 text-[#fffef9]">

        {/* PROFILE */}
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6 flex justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ee2346] to-[#7dd3fc] text-xl font-bold">
              {perfil.nombre?.charAt(0) ?? "C"}
            </div>

            <div>
              <h1 className="text-xl font-bold">{perfil.nombre}</h1>
              <p className="text-sm text-[#fffef9]/60">{perfil.email}</p>
            </div>

          </div>

          <div className="text-right">
            <p className="text-xs text-[#fffef9]/50">Chilli Points</p>
            <p className="text-2xl font-bold text-[#ee2346]">
              🌶 {perfil.chilliPoints}
            </p>
          </div>

        </div>

        {/* STATS */}
        <div className="grid gap-4 md:grid-cols-4">

          <Stat title="Tareas" value={perfil.totalTareas} />
          <Stat title="Pendientes" value={perfil.tareasPendientes} />
          <Stat title="Aprobadas" value={perfil.tareasAprobadas} />
          <Stat title="Chilli" value={`🌶 ${perfil.chilliPoints}`} />

        </div>

        {/* PREMIOS DISPONIBLES */}
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6">

          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Gift size={16} /> Premios
          </h2>

          <div className="space-y-3">

            {premios.map((p) => {

              const canAfford = perfil.chilliPoints >= p.puntos_costo;

              return (
                <div
                  key={p.id_premio}
                  className="rounded-lg border border-[#4a4748]/30 bg-[#1f1f24] p-4"
                >
                  <div className="font-semibold">{p.nombre}</div>

                  <div className="mb-2 text-xs text-[#fffef9]/60">
                    {p.descripcion}
                  </div>

                  <div className="flex items-center justify-between">

                    <span className="font-bold text-[#ee2346]">
                      🌶 {p.puntos_costo}
                    </span>

                    <button
                      disabled={!canAfford || canjeando === p.id_premio}
                      onClick={() => canjearPremio(p.id_premio)}
                      className={`rounded px-3 py-1 text-xs ${
                        canAfford && canjeando !== p.id_premio
                          ? "bg-[#6cbe45] hover:bg-[#5aaa3c]"
                          : "cursor-not-allowed bg-[#4a4748]"
                      }`}
                    >
                      {canjeando === p.id_premio
                        ? "Canjeando..."
                        : "Canjear"}
                    </button>

                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* PREMIOS CANJEADOS */}
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6">

          <h2 className="mb-4 font-semibold">
            Premios Canjeados
          </h2>

          <div className="space-y-3">

            {redenciones.length === 0 && (
              <div className="text-xs text-[#fffef9]/50">
                No hay premios canjeados
              </div>
            )}

            {redenciones.map((r) => (

              <div
                key={r.id_canje}
                className="rounded-lg border border-[#4a4748]/30 bg-[#1f1f24] p-4 flex justify-between items-center"
              >

                <div>

                  <div className="font-semibold">
                    {r.premio_nombre}
                  </div>

                  <div className="text-xs text-[#fffef9]/60">
                    🌶 {r.puntos_usados}
                  </div>

                  <div className="text-xs text-[#fffef9]/40">
                    {new Date(r.fecha_canje).toLocaleDateString()}
                  </div>

                </div>

                {r.estado === "ACTIVO" ? (

                  <button
                    onClick={() => marcarUsado(r.id_canje)}
                    className="flex items-center gap-2 text-xs bg-[#ee2346] px-3 py-1 rounded"
                  >
                    <CheckCircle size={14} />
                    Marcar usado
                  </button>

                ) : (

                  <span className="text-xs text-[#6cbe45] font-semibold">
                    Usado
                  </span>

                )}

              </div>

            ))}

          </div>
        </div>

      </div>
    </Shell>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
      <p className="text-xs text-[#fffef9]/50">{title}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}