"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Wrench, Users, FileText, BarChart3, LogOut, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthContext";

export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  // TODOS los hooks arriba
  const [now, setNow] = useState(new Date());
  const [temp, setTemp] = useState(null);
  const [phrase, setPhrase] = useState("");

  const phrases = [
    "El éxito es la suma de pequeños esfuerzos repetidos cada día.",
    "La excelencia no es un acto, es un hábito.",
    "Hazlo con pasión o no lo hagas.",
    "La disciplina es el puente entre metas y logros.",
    "El único modo de hacer un gran trabajo es amar lo que haces.",
    "No cuentes los días, haz que los días cuenten.",
    "La constancia es la clave del éxito.",
    "El trabajo duro vence al talento cuando el talento no trabaja duro.",
  ];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = new Date();
    const daySeed = today.getFullYear() * 1000 + today.getMonth() * 100 + today.getDate();
    const idx = (daySeed + 7) % phrases.length;
    setPhrase(phrases[idx]);
  }, [now]);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-1.0286&longitude=-79.4635&current_weather=true"
    )
      .then((r) => r.json())
      .then((data) => setTemp(data.current_weather?.temperature ?? null))
      .catch(() => setTemp(null));
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    router.replace("/login");
  };

  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const d = now;
  const day = days[d.getDay()];
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (loading) return null;

  // ======================
  // NO AUTENTICADO: MISMA pantalla bonita + Login embebido (siempre)
  // ======================
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-linear-to-br from-red-50 via-stone-50 to-white">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="text-lg font-bold text-stone-700">{day}, {dateStr}</div>
            <div className="text-2xl font-black text-red-600 tracking-widest">{timeStr}</div>
            <div className="text-sm text-stone-500">
              {temp !== null ? `Quevedo: ${temp}°C` : "Cargando temperatura..."}
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-stone-900 tracking-tight">
            Sistema de Gestión <span className="block text-red-600 mt-2">Rectificadora de Motores</span>
          </h1>

          <p className="text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Bienvenido. Inicia sesión para continuar.
          </p>

          <div className="my-6 p-4 rounded-xl bg-stone-100 text-stone-700 text-lg font-semibold shadow">
            <span className="italic">{phrase}</span>
          </div>

          <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 border border-stone-200 text-left">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-center">
              Rectificadora <span className="text-red-600">Mindiocar</span>
            </h2>
            <p className="text-sm text-stone-600 text-center mt-2">Iniciar sesión</p>
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // AUTENTICADO: MENÚ con día/hora/temperatura arriba
  // Reglas por rol:
  // - técnico: NO ver "Gestión de Clientes", NO "Configuración", NO "Facturación (crear)", pero SÍ ver "PDFs", "Tareas", "Agente"
  // - admin: todo
  // ======================
  const isTecnico = (role || "").toLowerCase() === "tecnico";

  const menuAll = [
    { icon: <FileText className="w-10 h-10 text-red-600" />, label: "Órdenes de Trabajo", href: "/gestor", desc: "Control completo del ciclo de reparación", roles: ["admin", "tecnico"] },
    { icon: <Users className="w-10 h-10 text-blue-600" />, label: "Gestión de Clientes", href: "/clientes", desc: "Base de datos de talleres y clientes", roles: ["admin"] },
    { icon: <BarChart3 className="w-10 h-10 text-green-600" />, label: "Dashboard", href: "/dashboard", desc: "Métricas y análisis en tiempo real", roles: ["admin", "tecnico"] },
    { icon: <Wrench className="w-10 h-10 text-purple-600" />, label: "Control de Taller", href: "/tareas", desc: "Motores en taller / seguimiento", roles: ["admin", "tecnico"] },
    { icon: <FileText className="w-10 h-10 text-orange-500" />, label: "Facturación", href: "/facturacion", desc: "Gestión y emisión de facturas", roles: ["admin"] },
    { icon: <FileText className="w-10 h-10 text-pink-500" />, label: "PDFs", href: "/proformas", desc: "Sube y visualiza archivos PDF", roles: ["admin", "tecnico"] },
    { icon: <Database className="w-10 h-10 text-red-600" />, label: "Motores", href: "/motores", desc: "Catalogo y busqueda rapida de motores", roles: ["admin", "tecnico"] },
    { icon: <BarChart3 className="w-10 h-10 text-emerald-600" />, label: "Agente Mecánico", href: "/asistente-ai", desc: "Asistente inteligente para consultas", roles: ["admin", "tecnico"] },
    { icon: <Wrench className="w-10 h-10 text-gray-600" />, label: "Configuración", href: "/settings", desc: "Tema y ajustes del sistema", roles: ["admin", "tecnico"] },
  ];

  const menu = menuAll.filter((it) => it.roles.includes(isTecnico ? "tecnico" : "admin"));

  // Tarjeta “Cerrar sesión” como una más (no arriba)
  const menuWithLogout = [
    ...menu,
    { icon: <LogOut className="w-10 h-10 text-stone-900" />, label: "Cerrar sesión", action: "logout", desc: "Salir del sistema" },
  ];

  return (
    <div className="min-h-screen p-8 bg-linear-to-br from-red-50 via-stone-50 to-white">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        {/* Bloque de día/hora/temp en el MENÚ */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-lg font-bold text-stone-700">{day}, {dateStr}</div>
          <div className="text-2xl font-black text-red-600 tracking-widest">{timeStr}</div>
          <div className="text-sm text-stone-500">
            {temp !== null ? `Quevedo: ${temp}°C` : "Cargando temperatura..."}
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-center text-stone-900 tracking-tight">
          Menú Principal <span className="block text-red-600 mt-2">Rectificadora Mindiocar</span>
        </h1>

        <div className="my-2 p-4 rounded-xl bg-stone-100 text-stone-700 text-base md:text-lg font-semibold shadow text-center">
          <span className="italic">{phrase}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
          {menuWithLogout.map((item) => {
            const Card = (
              <div className="w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 hover:shadow-2xl transition flex flex-col items-center justify-center text-center">
                <div className="mb-4">{item.icon}</div>
                <div className={`text-xl font-bold ${item.action === "logout" ? "text-brand-red" : ""}`}>{item.label}</div>
                <div className="text-stone-500 mt-2 text-sm">{item.desc}</div>
              </div>
            );

            if (item.action === "logout") {
              return (
                <button key={item.label} type="button" onClick={handleLogout} className="w-full">
                  {Card}
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href} className="w-full">
                {Card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSubmitting(true);
    const ok = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!ok) setLocalError("Credenciales incorrectas o usuario no existe.");
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {(error || localError) && (
        <p className="text-sm text-red-600 text-center">{error || localError}</p>
      )}

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
  );
}


