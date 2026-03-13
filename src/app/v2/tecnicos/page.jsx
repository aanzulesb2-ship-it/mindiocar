"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const DEFAULT_TECHS = Array.from({ length: 23 }).map((_, i) => ({
  id: `tech_${i + 1}`,
  nombre: `Tecnico ${i + 1}`,
  activo: true,
}));

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const j = JSON.parse(raw);
    return j ?? fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function V2TecnicosPage() {
  const [tecnicos, setTecnicos] = useState([]);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [err, setErr] = useState(null);

  useEffect(() => {
    const list = loadLS("v2_tecnicos", DEFAULT_TECHS);
    setTecnicos(Array.isArray(list) ? list : DEFAULT_TECHS);
  }, []);

  useEffect(() => {
    if (!tecnicos?.length) return;
    saveLS("v2_tecnicos", tecnicos);
  }, [tecnicos]);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tecnicos;
    return tecnicos.filter((t) => String(t.nombre || "").toLowerCase().includes(s));
  }, [tecnicos, q]);

  function agregar() {
    setErr(null);
    const name = nuevo.trim();
    if (!name) return setErr("Escribe un nombre.");
    const id = "tech_" + Date.now();
    setTecnicos((prev) => [{ id, nombre: name, activo: true }, ...prev]);
    setNuevo("");
  }

  function toggleActivo(id) {
    setTecnicos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t))
    );
  }

  function eliminar(id) {
    const ok = confirm("¿Seguro que deseas ELIMINAR este técnico?");
    if (!ok) return;
    setTecnicos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="bg-white border border-stone-200 rounded-2xl shadow p-6">
          <h1 className="text-3xl font-black">V2 • Técnicos / Operarios</h1>
          <p className="text-stone-600 mt-1">
            Modo demo: se guarda en este navegador (localStorage). Luego lo conectamos a Supabase.
          </p>
        </div>

        {err ? (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700">{err}</div>
        ) : null}

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5 space-y-3">
          <div className="font-black">Agregar técnico</div>
          <div className="flex gap-2 flex-wrap">
            <input
              className="px-3 py-2 rounded-xl border flex-1 min-w-[240px]"
              placeholder="Nombre del técnico (ej: Juan Pérez)"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
            />
            <button
              onClick={agregar}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-black"
              type="button"
            >
              Agregar
            </button>
          </div>

          <div className="pt-2">
            <input
              className="px-3 py-2 rounded-xl border w-full"
              placeholder="Buscar técnico..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5">
          <div className="font-black mb-3">Listado ({filtrados.length})</div>

          {filtrados.length === 0 ? (
            <div className="text-stone-500">No hay técnicos.</div>
          ) : (
            <div className="space-y-2">
              {filtrados.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-black text-stone-900">{t.nombre}</div>
                    <div className="text-xs text-stone-500">ID: <span className="font-mono">{t.id}</span></div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActivo(t.id)}
                      className={[
                        "px-3 py-2 rounded-xl border font-bold",
                        t.activo ? "bg-green-50 border-green-200 text-green-800" : "bg-stone-50 border-stone-200 text-stone-700",
                      ].join(" ")}
                    >
                      {t.activo ? "Activo" : "Inactivo"}
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminar(t.id)}
                      className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 font-black"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-stone-500">
            Nota: luego ponemos “confirmación por contraseña/código” SOLO admin.
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}