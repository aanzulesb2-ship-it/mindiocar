"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    // Si ya hay sesión, no tiene sentido ver login
    if (!loading && user) router.replace("/gestor");
  }, [user, loading, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSubmitting(true);

    const ok = await signIn(email.trim(), password);
    setSubmitting(false);

    if (ok) {
      router.replace("/gestor");
    } else {
      setLocalError("Credenciales incorrectas o usuario no existe.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Cargando sesión...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-stone-200">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-center">
          Rectificadora <span className="text-red-600">Mindiocar</span>
        </h1>
        <p className="text-sm text-stone-600 text-center mt-2">Iniciar sesión</p>

        {(error || localError) && (
          <p className="mt-4 text-sm text-red-600 text-center">
            {error || localError}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            className="w-full border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-300"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-300"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-red-600 text-white font-semibold py-2 hover:bg-red-700 transition disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

