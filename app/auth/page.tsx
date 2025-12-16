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
    <div className="min-h-screen flex flex-col bg-[#262425]">
      {/* Page body */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex justify-center mb-6">
              <Image
                src="/mock-logo-sandia-con-chole.png"
                alt="SandiaShake"
                width={160}
                height={40}
                className="object-contain"
              />
            </div>

            <div className="bg-[#2b2b30] rounded-xl shadow-md border border-[#3a3a40]">
              <div className="px-8 py-7">
                <h1 className="text-lg font-semibold text-center mb-5 text-white">
                  Inicia sesión en tu cuenta
                </h1>

                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-400">
                        Correo electrónico
                      </label>
                    </div>
                    <input
                      type="email"
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                      placeholder="admin@sandia.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-400">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-gray-400 hover:text-white"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
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
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    />
                    Mantener sesión iniciada
                  </label>
                </div>

                {/* Error message */}
                {error && (
                  <p className="mt-3 text-xs text-center text-red-400">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="mt-5 w-full rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white py-2 text-sm font-semibold uppercase tracking-wide transition"
                >
                  Entrar
                </button>

                <p className="mt-3 text-[11px] text-center text-gray-400">
                  Nuevo en SandíaShake?{" "}
                  <a
                    href="#"
                    className="underline font-medium hover:text-white"
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
      <footer className="py-3 text-center text-[11px] text-gray-400">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
