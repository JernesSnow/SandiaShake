"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "react-feather";

export default function SignUpPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validaciones del lado del cliente
    if (!nombre || !email || !password || !confirmPassword) {
      setError("Por favor completa todos los campos");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          correo: email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        return;
      }

      // Registro exitoso
      setSuccess(true);
    } catch (err: any) {
      console.error("SIGNUP ERROR:", err);
      setError(err?.message ?? "Ocurrió un error al registrarse.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#262425]">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <div className="flex justify-center mb-6">
              <Image
                src="/mock-logo-sandia-con-chole.png"
                alt="SandiaShake"
                width={160}
                height={40}
                className="object-contain"
              />
            </div>

            <div className="bg-[#2b2b30] rounded-xl shadow-md border border-[#3a3a40] px-8 py-7">
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-[#6cbe45]/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-[#6cbe45]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>

                <h1 className="text-lg font-semibold text-white mb-3">
                  ¡Registro Exitoso!
                </h1>

                <p className="text-sm text-gray-400 mb-6">
                  Hemos enviado un correo de confirmación a{" "}
                  <span className="text-white font-medium">{email}</span>.
                  <br />
                  <br />
                  Por favor revisa tu bandeja de entrada y haz clic en el enlace
                  de confirmación para activar tu cuenta.
                </p>

                <div className="bg-[#1a1a1d] border border-[#3a3a40] rounded-md p-4 mb-6">
                  <p className="text-xs text-gray-400">
                    <strong className="text-gray-300">Nota:</strong> Si no ves el
                    correo en tu bandeja de entrada, revisa tu carpeta de spam o
                    correo no deseado.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/auth")}
                  className="w-full rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white py-2 text-sm font-semibold uppercase tracking-wide transition"
                >
                  Ir a iniciar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="py-3 text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} SandíaShake · Todos los derechos
          reservados
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#262425]">
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
                <h1 className="text-lg font-semibold text-center mb-2 text-white">
                  Crear cuenta nueva
                </h1>
                <p className="text-center text-xs text-gray-400 mb-5">
                  Regístrate para acceder a nuestros cursos y herramientas
                </p>

                <div className="space-y-4">
                  {/* Nombre completo */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                      placeholder="Juan Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Mínimo 8 caracteres
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45] focus:border-[#6cbe45]"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
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

                {/* Error message */}
                {error && (
                  <p className="mt-3 text-xs text-center text-red-400">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] disabled:opacity-60 text-white py-2 text-sm font-semibold uppercase tracking-wide transition"
                >
                  {loading ? "Registrando..." : "Crear cuenta"}
                </button>

                <p className="mt-3 text-[11px] text-center text-gray-400">
                  ¿Ya tienes cuenta?{" "}
                  <a
                    href="/auth"
                    className="underline font-medium hover:text-white"
                  >
                    Iniciar sesión
                  </a>
                </p>

                <p className="mt-4 text-[10px] text-center text-gray-500">
                  Al registrarte, aceptas nuestros términos de servicio y
                  política de privacidad
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      <footer className="py-3 text-center text-[11px] text-gray-400">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
