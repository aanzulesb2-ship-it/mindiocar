"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

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

export default function V2TareasPage() {
  const [tareas, setTareas] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const list = loadLS("v2_tareas", []);
    setTareas(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    saveLS("v2_tareas", tareas);
  }, [tareas]);

  const filtradas = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tareas;
    return tareas.filter((t) =>
      [t.nombre, t.tecnico, t.estado, t.orden_id].some((x) => String(x || "").toLowerCase().includes(s))
    );
  }, [tareas, q]);

  function setEstado(id, estado) {
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado } : t)));
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="bg-white border border-stone-200 rounded-2xl shadow p-6">
          <h1 className="text-3xl font-black">V2 â€¢ Tareas</h1>
          <p className="text-stone-600 mt-1">
            Modo demo: aquÃ­ luego mostramos â€œsolo mis tareasâ€ para tÃ©cnicos, y admin ve todo.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5 space-y-3">
          <div className="font-black">Buscar</div>
          <input
            className="px-3 py-2 rounded-xl border w-full"
            placeholder="Buscar por nombre, tÃ©cnico, estado o id de orden..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5">
          <div className="font-black mb-3">Listado ({filtradas.length})</div>

          {filtradas.length === 0 ? (
            <div className="text-stone-500">
              No hay tareas aÃºn. (Cuando creemos tareas desde una orden, aparecerÃ¡n aquÃ­.)
            </div>
          ) : (
            <div className="space-y-2">
              {filtradas.map((t, i) => (
                <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-black">#{String(t.numero || i + 1).padStart(3, "0")} {t.nombre || "â€”"}</div>
                    <div className="text-xs text-stone-600">
                      Orden: <span className="font-mono">{t.orden_id || "â€”"}</span> â€¢ TÃ©cnico: {t.tecnico || "â€”"} â€¢ Estado:{" "}
                      <span className="font-black">{t.estado || "pendiente"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-2 rounded-xl border font-bold" onClick={() => setEstado(t.id, "pendiente")}>
                      Pendiente
                    </button>
                    <button className="px-3 py-2 rounded-xl border font-bold" onClick={() => setEstado(t.id, "en_proceso")}>
                      En proceso
                    </button>
                    <button className="px-3 py-2 rounded-xl border font-bold" onClick={() => setEstado(t.id, "pausada")}>
                      Pausada
                    </button>
                    <button className="px-3 py-2 rounded-xl bg-green-600 text-white font-black" onClick={() => setEstado(t.id, "finalizada")}>
                      Finalizada
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-stone-500">
            PrÃ³ximo paso: mini-chat por tarea + bandeja admin.
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
