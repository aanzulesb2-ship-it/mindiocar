"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { applyAppTheme } from "@/components/ThemeInitializer";

const THEMES = [
  { id: "caterpillar", name: "Caterpillar", accent: "#ffd60a", accentStrong: "#ffb800", bg: "#f5f5f4" },
  { id: "ocean", name: "Oceano", accent: "#0ea5e9", accentStrong: "#0369a1", bg: "#f0f9ff" },
  { id: "forest", name: "Bosque", accent: "#16a34a", accentStrong: "#166534", bg: "#f0fdf4" },
  { id: "sunset", name: "Atardecer", accent: "#ea580c", accentStrong: "#c2410c", bg: "#fff7ed" },
  { id: "graphite", name: "Grafito", accent: "#374151", accentStrong: "#111827", bg: "#f3f4f6" },
  { id: "violet", name: "Violeta", accent: "#7c3aed", accentStrong: "#5b21b6", bg: "#f5f3ff" },
  { id: "rose", name: "Rosa", accent: "#e11d48", accentStrong: "#9f1239", bg: "#fff1f2" },
  { id: "amber", name: "Ambar", accent: "#d97706", accentStrong: "#92400e", bg: "#fffbeb" },
  { id: "teal", name: "Teal", accent: "#0d9488", accentStrong: "#115e59", bg: "#f0fdfa" },
  { id: "indigo", name: "Indigo", accent: "#4f46e5", accentStrong: "#312e81", bg: "#eef2ff" },
];

function themeKeyForUser(userId) {
  return `app_theme_v1_${userId || "anon"}`;
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [themeId, setThemeId] = useState("caterpillar");
  const [colorMode, setColorMode] = useState("light");
  const [msgTheme, setMsgTheme] = useState("");

  useEffect(() => {
    let timeoutId;

    try {
      const key = themeKeyForUser(user?.id);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const found = THEMES.find((t) => t.id === parsed?.id) || THEMES[0];
      const mode = parsed?.mode === "dark" ? "dark" : "light";
      timeoutId = window.setTimeout(() => {
        setThemeId(found.id);
        setColorMode(mode);
      }, 0);
      applyAppTheme({ ...found, mode });
    } catch {
      applyAppTheme({ ...THEMES[0], mode: "light" });
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [user?.id]);

  const onSaveTheme = () => {
    const selected = THEMES.find((t) => t.id === themeId) || THEMES[0];
    const payload = { ...selected, mode: colorMode };
    applyAppTheme(payload);
    localStorage.setItem(themeKeyForUser(user?.id), JSON.stringify(payload));
    setMsgTheme("Tema guardado para este usuario.");
  };




  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-5">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5">
          <h1 className="text-2xl font-black tracking-tight">Configuraciones</h1>
          <p className="text-sm text-stone-500 mt-1">
            Ajusta el tema de la aplicación (por usuario). Aqui puedes elegir color y fondo claro/oscuro.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black">Tema de la App</h2>
            <p className="text-sm text-stone-500">
              Esta seleccion es independiente por usuario (no afecta a otros).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                className={
                  "p-3 rounded-xl border text-left transition " +
                  (themeId === t.id ? "border-stone-900 ring-2 ring-stone-300" : "border-stone-200 hover:bg-stone-50")
                }
              >
                <div className="font-semibold">{t.name}</div>
                <div className="mt-2 flex gap-2">
                  <span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: t.accent }} />
                  <span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: t.accentStrong }} />
                  <span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: t.bg }} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Fondo</div>
            <div className="inline-flex gap-2 border border-stone-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setColorMode("light")}
                className={
                  "px-3 py-2 text-sm font-semibold transition " +
                  (colorMode === "light"
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-700 hover:bg-stone-100")
                }
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setColorMode("dark")}
                className={
                  "px-3 py-2 text-sm font-semibold transition " +
                  (colorMode === "dark"
                    ? "bg-green-600 text-white"
                    : "bg-white text-stone-700 hover:bg-stone-100")
                }
              >
                Oscuro
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSaveTheme}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800"
            >
              Guardar tema
            </button>
            {msgTheme ? <span className="text-sm text-green-700">{msgTheme}</span> : null}
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
