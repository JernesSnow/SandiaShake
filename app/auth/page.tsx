"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "react-feather";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 🔐 TEMPORARY DEV LOGIN
    if (email === "admin@sandia.com" && password === "admin123") {
      if (keepLoggedIn) {
        localStorage.setItem("role", "admin");
      }
      router.push("/dashboard");
      return;
    }

    setError("Credenciales inválidas (usa admin@sandia.com / admin123 en dev).");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Page body */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex justify-center mb-6">
              {/* 👇 Put your logo file in /public/logo-light.png or change src */}
              <Image
                src="/logo-light.png"
                alt="SandiaShake"
                width={160}
                height={40}
                className="object-contain"
              />
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200">
              <div className="px-8 py-7">
                <h1 className="text-lg font-semibold text-center mb-5">
                  Inicia sesión en tu cuenta
                </h1>

                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Correo electrónico
                      </label>
                    </div>
                    <input
                      type="email"
                      className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/70 focus:border-slate-900"
                      placeholder="admin@sandia.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-slate-900/70 focus:border-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
                      >
                        {showPassword ? (
                          <EyeOff size={16} className="form-icon" />
                        ) : (
                          <Eye size={16} className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Keep me logged in */}
                <div className="flex justify-center mt-4">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    />
                    Mantener sesión iniciada
                  </label>
                </div>

                {/* Error message */}
                {error && (
                  <p className="mt-3 text-xs text-center text-red-500">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="mt-5 w-full rounded-md bg-slate-900 text-slate-50 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-slate-800 transition"
                >
                  Entrar
                </button>

                <p className="mt-3 text-[11px] text-center text-slate-500">
                  Nuevo en SandíaShake?{" "}
                  <a
                    href="#"
                    className="underline font-medium hover:text-slate-800"
                  >
                    Crear cuenta
                  </a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Simple footer */}
      <footer className="py-3 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
