"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

function safeId(params) {
  const raw = params?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function V2OrdenDetalle() {
  const params = useParams();
  const id = safeId(params);

  const [msg, setMsg] = useState(null);

  const short = useMemo(() => String(id || "").slice(0, 8), [id]);

  async function crearTareasBase() {
    setMsg(null);

    // Por ahora: intentamos API, si falla igual avanzamos (modo demo)
    try {
      const r = await fetch(`/api/v2/ordenes-trabajo/${id}/crear-tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "No se pudo crear tareas");
      setMsg({ ok: true, text: `Tareas base creadas (${j?.total || "?"}).` });
      return;
    } catch (e) {
      setMsg({ ok: false, text: `(Modo demo) API aún no lista: ${e.message}. Igual seguimos.` });
    }

    // demo: metemos 23 tareas “base” en localStorage
    try {
      const base = [
        "Cigüeñal","Bielas","Block","Cabezote","Camisas","Pistones","Válvulas","Asientos","Guías","Retenes",
        "Taqués","Balancines","Volante","Cárter","Rectificado","Lavado","Prensa","Mediciones","Armado motor",
        "Prueba","Limpieza final","Entrega","Garantía"
      ];

      const techs = JSON.parse(localStorage.getItem("v2_tecnicos") || "[]");
      const pickTech = (i) => (techs?.[i % Math.max(1, techs.length)]?.nombre || "Tecnico 1");

      const tareas = base.slice(0, 23).map((nombre, i) => ({
        id: "t_" + Date.now() + "_" + i,
        orden_id: id,
        numero: String(i + 1).padStart(3, "0"),
        nombre,
        tecnico: pickTech(i),
        estado: "pendiente",
      }));

      const prev = JSON.parse(localStorage.getItem("v2_tareas") || "[]");
      localStorage.setItem("v2_tareas", JSON.stringify([...(Array.isArray(prev) ? prev : []), ...tareas]));
    } catch {}
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black">V2 • Orden #{short || "—"}</h1>
            <div className="text-xs text-stone-500 mt-1">
              ID completo: <span className="font-mono">{id || "—"}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link href="/v2/ordenes" className="px-3 py-2 rounded-xl border bg-white font-semibold">
              Volver
            </Link>
            <Link href="/v2/tareas" className="px-3 py-2 rounded-xl bg-red-600 text-white font-black">
              Ver tareas
            </Link>
          </div>
        </div>

        {msg ? (
          <div className={[
            "p-4 rounded-2xl border",
            msg.ok ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
          ].join(" ")}>
            {msg.text}
          </div>
        ) : null}

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-6 space-y-3">
          <div className="font-black text-lg">Acciones rápidas</div>

          <button
            onClick={crearTareasBase}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-black"
            type="button"
          >
            Crear 23 tareas base (por defecto)
          </button>

          <div className="text-sm text-stone-600">
            Próximo: asignación real por técnico + mini-chat por tarea + porcentaje y pausas.
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
