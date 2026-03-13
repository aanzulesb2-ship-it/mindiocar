"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { AlertTriangle, Trash2, Pencil, Eye, CalendarDays, Gauge, CheckCircle2 } from "lucide-react";
import { matchesOrdenSearch } from "@/lib/ordenesSearch";
import { buildOrdenNumberMap, formatOrdenCode } from "@/lib/ordenesDisplay";

const PRIORITY_ORDER = ["urgente", "alta", "media", "baja"];

const PRIORITY_META = {
  urgente: { label: "Urgente", badge: "bg-white text-brand-red border border-red-200" },
  alta: { label: "Alta", badge: "bg-orange-500 text-white" },
  media: { label: "Media", badge: "bg-yellow-400 text-stone-900" },
  baja: { label: "Baja", badge: "bg-stone-200 text-stone-800" },
};

function normalizePriority(p) {
  const v = String(p || "").toLowerCase().trim();
  if (PRIORITY_ORDER.includes(v)) return v;
  return "media";
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}

export default function GestorPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [finishingId, setFinishingId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchOrdenes = async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("ordenes")
      .select("id, cliente, mecanico_dueno, motor, tipo_motor, prioridad, fecha_estimada, estado, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErr(error.message || "No se pudieron cargar las órdenes.");
      setOrdenes([]);
    } else {
      setOrdenes(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const { grouped, completed, numberMap } = useMemo(() => {
    const base = { urgente: [], alta: [], media: [], baja: [] };
    const done = [];
    const map = buildOrdenNumberMap(ordenes);

    for (const o of ordenes) {
      if (!matchesOrdenSearch(o, search)) continue;
      const estado = String(o.estado || "").toLowerCase().trim();
      if (estado === "completado" || estado === "finalizado" || estado === "realizado") {
        done.push(o);
        continue;
      }
      const pr = normalizePriority(o.prioridad);
      base[pr].push({ ...o, prioridad: pr });
    }

    for (const k of PRIORITY_ORDER) {
      base[k].sort((a, b) => {
        const da = a.fecha_estimada ? new Date(a.fecha_estimada).getTime() : new Date(a.created_at || 0).getTime();
        const db = b.fecha_estimada ? new Date(b.fecha_estimada).getTime() : new Date(b.created_at || 0).getTime();
        return da - db;
      });
    }

    done.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return { grouped: base, completed: done, numberMap: map };
  }, [ordenes, search]);

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    const ok = window.confirm("¿Eliminar esta orden?\n\nEsto borrará el registro. (Las fotos en Storage se limpian luego.)");
    if (!ok) return;

    setDeletingId(id);
    const { error } = await supabase.from("ordenes").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      console.error(error);
      alert("No se pudo eliminar.\n\nDetalle: " + (error.message || JSON.stringify(error)));
      return;
    }
    fetchOrdenes();
  };

  const handleFinish = async (id) => {
    const ok = window.confirm("¿Marcar esta orden como COMPLETADA?");
    if (!ok) return;

    setFinishingId(id);
    const { error } = await supabase
      .from("ordenes")
      .update({ estado: "completado", updated_at: new Date().toISOString() })
      .eq("id", id);
    setFinishingId(null);

    if (error) {
      console.error(error);
      alert("No se pudo finalizar.\n\nDetalle: " + (error.message || JSON.stringify(error)));
      return;
    }

    fetchOrdenes();
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole={["admin", "tecnico"]}>
        <div className="p-6 text-stone-600">Cargando órdenes...</div>
      </ProtectedRoute>
    );
  }

  if (err) {
    return (
      <ProtectedRoute requiredRole={["admin", "tecnico"]}>
        <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-700">
          <div className="font-black flex items-center gap-2">
            <AlertTriangle size={18} />
            Error
          </div>
          <div className="mt-1 text-sm">{err}</div>
          <button
            onClick={fetchOrdenes}
            className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Órdenes de Trabajo
            </h1>
            <p className="text-stone-500 text-sm">
              Tablero por prioridad. Finaliza para mover a “Realizadas”.
            </p>
          </div>

          <Link
            href="/nueva-orden"
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition"
          >
            + Crear orden
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
            placeholder="Buscar por motor, mecanico, fecha o cliente..."
          />
        </div>

        {/* Tablero por prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PRIORITY_ORDER.map((key) => {
            const meta = PRIORITY_META[key];
            const list = grouped[key] || [];

            return (
              <div key={key} className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                  <div className="font-black text-stone-900">{meta.label}</div>
                  <span className="text-xs font-black px-2 py-1 rounded-lg bg-stone-100 border border-stone-200">
                    {list.length}
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {list.length === 0 ? (
                    <div className="text-sm text-stone-400 p-3 border border-dashed border-stone-200 rounded-xl">
                      Sin órdenes aquí.
                    </div>
                  ) : (
                    list.map((o) => (
                      <div
                        key={o.id}
                        className="p-4 rounded-2xl border border-stone-200 hover:shadow-md transition bg-white"
                        style={{ borderWidth: "0.5px" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] text-stone-500 uppercase font-black tracking-widest">
                              {formatOrdenCode(numberMap.get(o.id))}
                            </div>
                            <div className="mt-1 text-lg font-black text-stone-900 truncate">
                              {o.motor || "—"}
                            </div>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${meta.badge}`}>
                            {meta.label.toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-stone-700">
                          <div className="flex items-center gap-2">
                            <Gauge size={14} className="text-stone-400" />
                            <span className="font-bold">Estado:</span>{" "}
                            <span className="truncate">{o.estado || "pendiente"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="text-stone-400" />
                            <span className="font-bold">Fecha:</span>{" "}
                            <span>{fmtDate(o.fecha_estimada || o.created_at)}</span>
                          </div>

                          <div className="truncate">
                            <span className="font-bold">Cliente:</span> {o.cliente || "—"}
                          </div>
                          <div className="truncate">
                            <span className="font-bold">Mecánico/Dueño:</span> {o.mecanico_dueno || "—"}
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 flex-wrap">
                          <Link
                            href={`/gestor/${o.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition"
                          >
                            <Eye size={16} />
                            Ver
                          </Link>

                          <Link
                            href={`/ordenes/${o.id}/editar`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-white font-semibold hover:bg-stone-50 transition"
                          >
                            <Pencil size={16} />
                            Editar
                          </Link>

                          <button
                            onClick={() => handleFinish(o.id)}
                            disabled={finishingId === o.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-60"
                          >
                            <CheckCircle2 size={16} />
                            {finishingId === o.id ? "Finalizando..." : "Finalizar"}
                          </button>

                          {isAdmin ? (
                            <button
                              onClick={() => handleDelete(o.id)}
                              disabled={deletingId === o.id}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-brand-red border border-red-200 font-semibold hover:bg-red-50 transition disabled:opacity-60"
                            >
                              <Trash2 size={16} />
                              {deletingId === o.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Realizadas */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <div className="font-black text-stone-900">✅ Realizadas</div>
            <div className="text-xs font-black px-2 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {completed.length}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.length === 0 ? (
              <div className="text-sm text-stone-400 p-3 border border-dashed border-stone-200 rounded-xl">
                Aún no hay órdenes finalizadas.
              </div>
            ) : (
              completed.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50" style={{ borderWidth: "0.5px" }}>
                  <div className="text-[11px] text-stone-500 uppercase font-black tracking-widest">
                    {formatOrdenCode(numberMap.get(o.id))}
                  </div>
                  <div className="mt-1 text-lg font-black text-stone-900 truncate">
                    {o.motor || "—"}
                  </div>
                  <div className="mt-1 text-sm text-stone-700 truncate">
                    <span className="font-bold">Cliente:</span> {o.cliente || "—"}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/gestor/${o.id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition"
                    >
                      <Eye size={16} />
                      Ver
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


