"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/lib/supabase";

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

function applyTheme(theme) {
  if (!theme || typeof window === "undefined") return;
  document.documentElement.style.setProperty("--app-accent", theme.accent);
  document.documentElement.style.setProperty("--app-accent-strong", theme.accentStrong);
  document.body.style.backgroundColor = theme.bg;
}

export default function SettingsPage() {
  const { role, user } = useAuth();
  const router = useRouter();
  const isAdmin = useMemo(() => role === "admin", [role]);

  const [themeId, setThemeId] = useState("caterpillar");
  const [msgTheme, setMsgTheme] = useState("");

  const [targetUserId, setTargetUserId] = useState("");
  const [targetNewPassword, setTargetNewPassword] = useState("");
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [msgAdminPassword, setMsgAdminPassword] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserLabel, setSelectedUserLabel] = useState("");

  useEffect(() => {
    try {
      const key = themeKeyForUser(user?.id);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const found = THEMES.find((t) => t.id === parsed?.id) || THEMES[0];
      setThemeId(found.id);
      applyTheme(found);
    } catch {
      applyTheme(THEMES[0]);
    }
  }, [user?.id]);

  const onSaveTheme = () => {
    const selected = THEMES.find((t) => t.id === themeId) || THEMES[0];
    applyTheme(selected);
    localStorage.setItem(themeKeyForUser(user?.id), JSON.stringify(selected));
    setMsgTheme("Tema guardado para este usuario.");
  };

  const onAdminChangeUserPassword = async (e) => {
    e.preventDefault();
    setMsgAdminPassword("");

    if (!isAdmin) return;
    if (!targetUserId.trim() || targetNewPassword.length < 8) {
      setMsgAdminPassword("Ingresa user_id y contrasena minima de 8.");
      return;
    }
    setSavingAdminPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sesion invalida.");

      const res = await fetch("/api/admin/cambiar-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: targetUserId.trim(),
          new_password: targetNewPassword,
        }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Respuesta invalida del servidor.");
      }
      if (!res.ok) throw new Error(data?.error || "No se pudo cambiar contrasena.");

      const changedOwnPassword = targetUserId.trim() === user?.id || Boolean(data?.session_refresh_required);

      setTargetUserId("");
      setTargetNewPassword("");
      setSelectedUserLabel("");

      if (changedOwnPassword) {
        setMsgAdminPassword("Contrasena actualizada. Cerrando sesion...");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setMsgAdminPassword("Contrasena del usuario actualizada.");
    } catch (err) {
      setMsgAdminPassword(err?.message || "Error cambiando contrasena.");
    } finally {
      setSavingAdminPassword(false);
    }
  };

  const loadUsers = async (q) => {
    setLoadingUsers(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sesion invalida.");

      const res = await fetch(`/api/admin/cambiar-password?q=${encodeURIComponent(q || "")}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Respuesta invalida del servidor.");
      }
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar usuarios.");
      setUserOptions(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      setMsgAdminPassword(err?.message || "Error cargando usuarios.");
      setUserOptions([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers(userSearch);
  }, [isAdmin, userSearch]);

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-5">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5">
          <h1 className="text-2xl font-black tracking-tight">Configuraciones</h1>
          <p className="text-sm text-stone-500 mt-1">
            Usuarios: solo tema de colores. Admin: tema + cambio de contrasenas.
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

        {isAdmin ? (
          <>
            <form onSubmit={onAdminChangeUserPassword} className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-3">
              <div>
                <h2 className="text-lg font-black">Admin: cambiar contrasena de usuarios</h2>
                <p className="text-sm text-stone-500">Busca por email o nombre. Si cambias tu propia contrasena, la sesion se cerrara automaticamente.</p>
              </div>

              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="Buscar usuario por email/nombre..."
              />
              <div className="max-h-44 overflow-auto border border-stone-200 rounded-lg">
                {loadingUsers ? (
                  <div className="px-3 py-2 text-sm text-stone-500">Buscando usuarios...</div>
                ) : userOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-stone-500">Sin resultados.</div>
                ) : (
                  userOptions.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        setTargetUserId(u.id);
                        setSelectedUserLabel(`${u.email}${u.full_name ? ` (${u.full_name})` : ""}`);
                      }}
                      className={
                        "w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-stone-50 " +
                        (targetUserId === u.id ? "bg-stone-100 font-semibold" : "")
                      }
                    >
                      {u.email} {u.full_name ? `- ${u.full_name}` : ""}
                    </button>
                  ))
                )}
              </div>
              {selectedUserLabel ? <div className="text-xs text-stone-500">Seleccionado: {selectedUserLabel}</div> : null}
              <input
                type="password"
                value={targetNewPassword}
                onChange={(e) => setTargetNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="Nueva contrasena para ese usuario"
              />

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingAdminPassword}
                  className="px-4 py-2 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-50"
                >
                  {savingAdminPassword ? "Procesando..." : "Cambiar contrasena usuario"}
                </button>
                {msgAdminPassword ? <span className="text-sm text-stone-700">{msgAdminPassword}</span> : null}
              </div>
            </form>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
