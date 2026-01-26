"use client";

import { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "No se pudo enviar el acceso temporal.");
    } else {
      setOk("Te enviamos un acceso temporal a tu correo.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425] px-4">
      <div className="w-full max-w-md bg-[#2b2b30] border border-[#3a3a40] rounded-xl p-6">
        <div className="flex justify-center mb-6">
          <Image
            src="/mock-logo-sandia-con-chole.png"
            alt="SandíaShake"
            width={160}
            height={40}
          />
        </div>

        <h1 className="text-lg font-semibold text-center text-white mb-4">
          Recuperar acceso
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-[#1a1a1d] border border-[#3a3a40] px-3 py-2 text-sm text-white"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {ok && <p className="text-green-400 text-sm">{ok}</p>}

          <button
            disabled={loading}
            className="w-full bg-[#6cbe45] hover:bg-[#5fa93d] text-black py-2 rounded-md text-sm font-semibold"
          >
            {loading ? "Enviando..." : "Enviar acceso temporal"}
          </button>
        </form>
      </div>
    </div>
  );
}
