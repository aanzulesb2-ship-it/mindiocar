"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/lib/supabase";

function isDone(estado) {
  const v = String(estado || "").toLowerCase().trim();
  return ["completado", "completada", "finalizado", "finalizada", "realizado", "realizada"].includes(v);
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("es-EC");
  } catch {
    return String(d);
  }
}

export default function TareasPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const fetchDone = async () => {
    setLoading(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("ordenes")
      .select("id, cliente, motor, estado, mecanico_dueno, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (dbError) {
      setError(dbError.message || "No se pudo cargar tareas realizadas.");
      setRows([]);
    } else {
      const done = (data || []).filter((r) => isDone(r.estado));
      setRows(done);
    }
    setLoading(false);
    setSelected([]);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchDone();
    });
  }, []);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.includes(r.id)),
    [rows, selected]
  );

  const toggleOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelected((prev) => (allSelected ? [] : rows.map((r) => r.id)));
  };

  const deleteSelected = async () => {
    if (!isAdmin || selected.length === 0) return;
    const ok = window.confirm(`¿Eliminar ${selected.length} tareas realizadas? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setDeleting(true);
    const { error: delError } = await supabase.from("ordenes").delete().in("id", selected);
    setDeleting(false);

    if (delError) {
      alert("No se pudo eliminar en lote.\n\nDetalle: " + (delError.message || "Error desconocido"));
      return;
    }
    fetchDone();
  };

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Control de Taller</h1>
            <p className="text-sm text-stone-500">Solo tareas realizadas. Numeradas en orden desde 001.</p>
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.length === 0 || deleting}
              className="px-4 py-2 rounded-xl bg-yellow-400 text-stone-900 font-black hover:bg-yellow-500 disabled:opacity-50"
            >
              {deleting ? "Eliminando..." : `Eliminar seleccionadas (${selected.length})`}
            </button>
          ) : null}
        </div>

        {loading ? <div className="p-4 text-stone-600">Cargando tareas...</div> : null}
        {error ? <div className="p-4 rounded-2xl border border-yellow-200 bg-yellow-50 text-yellow-900">{error}</div> : null}

        {!loading && !error ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="p-3 text-left w-12">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left font-black">N°</th>
                    <th className="p-3 text-left font-black">Motor</th>
                    <th className="p-3 text-left font-black">Cliente</th>
                    <th className="p-3 text-left font-black">Mecánico/Dueño</th>
                    <th className="p-3 text-left font-black">Estado</th>
                    <th className="p-3 text-left font-black">Fecha</th>
                    <th className="p-3 text-left font-black">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-stone-100 last:border-b-0">
                      <td className="p-3">
                        <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                      </td>
                      <td className="p-3 font-bold">{String(i + 1).padStart(3, "0")}</td>
                      <td className="p-3">{r.motor || "-"}</td>
                      <td className="p-3">{r.cliente || "-"}</td>
                      <td className="p-3">{r.mecanico_dueno || "-"}</td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 uppercase font-bold text-xs">
                          {String(r.estado || "realizado")}
                        </span>
                      </td>
                      <td className="p-3">{fmtDate(r.updated_at || r.created_at)}</td>
                      <td className="p-3">
                        <Link
                          href={`/ordenes/${r.id}/editar`}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length === 0 ? (
              <div className="p-6 text-sm text-stone-400">No hay tareas realizadas todavía.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
