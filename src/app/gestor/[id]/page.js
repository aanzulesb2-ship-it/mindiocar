"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { formatOrdenCode } from "@/lib/ordenesDisplay";

function toArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [];
}

function onlyChecked(datosVino) {
  if (!datosVino || typeof datosVino !== "object") return [];
  return Object.entries(datosVino)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

function parseTasks(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function GestorDetalleOrden() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [orden, setOrden] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [error, setError] = useState(null);
  const [ordenCode, setOrdenCode] = useState("000");

  const checkedItems = useMemo(() => onlyChecked(orden?.datos_vino), [orden]);
  const tareas = useMemo(() => parseTasks(orden?.observaciones), [orden]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
        setOrden(null);
      } else {
        setOrden(data);
      }

      const { data: allRows } = await supabase
        .from("ordenes")
        .select("id, created_at")
        .order("created_at", { ascending: true });

      if (Array.isArray(allRows)) {
        const index = allRows.findIndex((row) => row.id === id);
        setOrdenCode(String(index + 1).padStart(3, "0"));
      }
      setLoading(false);
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const loadFotos = async () => {
      setLoadingFotos(true);
      try {
        const res = await fetch(`/api/ordenes/${id}/fotos`, { method: "GET" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar fotos");

        const clean = toArray(json?.fotos).filter((x) => x?.url);
        setFotos(clean);
      } catch (e) {
        console.error(e);
        setFotos([]);
      } finally {
        setLoadingFotos(false);
      }
    };

    loadFotos();
  }, [id]);

  const fotosBlock = useMemo(
    () => fotos.filter((f) => (f?.categoria || "").toLowerCase().includes("block")),
    [fotos]
  );
  const fotosCabezote = useMemo(
    () => fotos.filter((f) => (f?.categoria || "").toLowerCase().includes("cabezote")),
    [fotos]
  );

  if (loading) return <div className="p-6">Cargando orden...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!orden) return <div className="p-6">Orden no encontrada</div>;

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black">
            <span className="text-red-600">{formatOrdenCode(ordenCode)}</span>
            <span className="ml-3 text-stone-500 text-lg">#{ordenCode}</span>
          </h1>

          <div className="flex gap-2">
            <button onClick={() => router.back()} className="px-4 py-2 border rounded-xl">
              Volver
            </button>

            {role !== "tecnico" ? (
              <Link href={`/ordenes/${id}/editar`} className="px-4 py-2 bg-red-600 text-white rounded-xl">
                Editar
              </Link>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><b>Cliente:</b> {orden.cliente || "-"}</div>
          <div><b>Mecánico / Dueño:</b> {orden.mecanico_dueno || "-"}</div>
          <div><b>Cédula:</b> {orden.cedula_dueno || "-"}</div>
          <div><b>Motor:</b> {orden.motor || "-"}</div>
          <div><b>Serie:</b> {orden.serie_motor || "-"}</div>
          <div><b>Tipo:</b> {orden.tipo_motor || "-"}</div>
          <div><b>Estado:</b> {orden.estado || "-"}</div>
          <div><b>Prioridad:</b> {orden.prioridad || "-"}</div>
          <div><b>Fecha:</b> {orden.fecha_estimada ? String(orden.fecha_estimada) : "-"}</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="font-black">Tareas</div>
          {tareas.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tareas.map((tarea, index) => (
                <span
                  key={`${tarea}-${index}`}
                  className="px-3 py-2 rounded-2xl text-sm font-semibold bg-red-50 text-red-900 border border-red-200"
                >
                  {tarea}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-stone-500">No hay tareas registradas.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="font-black">Datos de recepción (solo seleccionados)</div>

          {checkedItems.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {checkedItems.map((it) => (
                <span
                  key={it}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {it}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-stone-500">No hay casillas marcadas.</div>
          )}

          {orden.datos_vino_detalle ? (
            <div className="mt-4">
              <div className="text-xs font-black uppercase tracking-widest text-stone-500">
                Detalle / novedades
              </div>
              <p className="mt-2 whitespace-pre-wrap text-stone-700">{orden.datos_vino_detalle}</p>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-black">Fotos de la orden</div>
            {loadingFotos ? <div className="text-sm text-stone-500">Cargando fotos...</div> : null}
          </div>

          {!loadingFotos && !fotos.length ? (
            <div className="mt-3 text-sm text-stone-500">No hay fotos guardadas en esta orden.</div>
          ) : null}

          {fotosBlock.length ? (
            <div className="mt-5">
              <div className="text-sm font-black text-stone-800">Block</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {fotosBlock.map((f, idx) => (
                  <a key={idx} href={f.url} target="_blank" rel="noreferrer">
                    <img
                      src={f.url}
                      alt={`Block ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {fotosCabezote.length ? (
            <div className="mt-6">
              <div className="text-sm font-black text-stone-800">Cabezote</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {fotosCabezote.map((f, idx) => (
                  <a key={idx} href={f.url} target="_blank" rel="noreferrer">
                    <img
                      src={f.url}
                      alt={`Cabezote ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
