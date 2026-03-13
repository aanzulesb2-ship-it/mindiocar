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

export default function V2BandejaPage() {
  const [mensajes, setMensajes] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const list = loadLS("v2_mensajes", []);
    setMensajes(Array.isArray(list) ? list : []);
  }, []);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mensajes;
    return mensajes.filter((m) =>
      [m.texto, m.tecnico, m.orden_id, m.tarea_id].some((x) => String(x || "").toLowerCase().includes(s))
    );
  }, [mensajes, q]);

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="bg-white border border-stone-200 rounded-2xl shadow p-6">
          <h1 className="text-3xl font-black">V2 • Bandeja (Admin)</h1>
          <p className="text-stone-600 mt-1">
            Aquí se juntan todos los mensajes de los mini-chats. (Modo demo local)
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5 space-y-3">
          <div className="font-black">Buscar</div>
          <input
            className="px-3 py-2 rounded-xl border w-full"
            placeholder="Buscar por técnico, orden, tarea o texto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5">
          <div className="font-black mb-3">Mensajes ({filtrados.length})</div>

          {filtrados.length === 0 ? (
            <div className="text-stone-500">
              Aún no hay mensajes. (Cuando activemos mini-chat por tarea, aparecerán aquí.)
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados
                .slice()
                .reverse()
                .map((m, idx) => (
                  <div key={m.id || idx} className="p-3 rounded-xl border">
                    <div className="text-xs text-stone-600">
                      Técnico: <span className="font-black">{m.tecnico || "—"}</span> • Orden:{" "}
                      <span className="font-mono">{m.orden_id || "—"}</span> • Tarea:{" "}
                      <span className="font-mono">{m.tarea_id || "—"}</span>
                    </div>
                    <div className="mt-1 font-semibold text-stone-900 whitespace-pre-wrap">{m.texto || "—"}</div>
                    <div className="mt-1 text-xs text-stone-500">{m.created_at || ""}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}