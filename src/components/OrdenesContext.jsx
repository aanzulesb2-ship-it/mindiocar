"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from '@/lib/supabase';

const OrdenesContext = createContext(null);

export function OrdenesProvider({ children }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("ordenes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setOrdenes([]);
    } else {
      setOrdenes(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  // Crea una "orden/tarea" (mínimo viable)
  const createOrden = useCallback(async (payload) => {
    setSaving(true);
    setError(null);

    // Importante: NO mandamos created_by; la BD lo pone con default auth.uid()
    const insertRow = {
      estado: payload.estado ?? "pendiente",
      tarea_titulo: payload.tarea_titulo ?? "Tarea",
      tarea_descripcion: payload.tarea_descripcion ?? payload.descripcion ?? "",
      tarea_prioridad: payload.tarea_prioridad ?? "media",

      // Campos clásicos (opcionales)
      cliente: payload.cliente ?? "",
      motor: payload.motor ?? "",
      trabajo: payload.trabajo ?? "",
      mecanico: payload.mecanico ?? "",
      observaciones: payload.observaciones ?? "",

      // Si vienen (opcionales)
      fecha_entrega: payload.fecha_entrega ?? null,
      precio: payload.precio ?? null,
      descripcion: (payload.descripcion ?? payload.tarea_descripcion ?? '').toString(),
      serie: payload.serie ?? null,
      tarea_tiempo_estimado: payload.tarea_tiempo_estimado ?? null,

      // Arrays: si no se usan, no los mandamos
      ...(payload.tarea_pasos ? { tarea_pasos: payload.tarea_pasos } : {}),
      ...(payload.fotos ? { fotos: payload.fotos } : {}),
      ...(payload.archivos ? { archivos: payload.archivos } : {}),
    };

    const { data, error } = await supabase
      .from("ordenes")
      .insert([insertRow])
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return { ok: false, error: error.message };
    }

    // Actualiza UI instantáneo
    setOrdenes((prev) => [data, ...prev]);
    setSaving(false);
    return { ok: true, data };
  }, []);

  const updateOrden = useCallback(async (id, patch) => {
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("ordenes")
      .update({
        ...(patch || {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return { ok: false, error: error.message };
    }

    setOrdenes((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
    setSaving(false);
    return { ok: true, data };
  }, []);

  const value = useMemo(() => {
    return {
      ordenes,
      loading,
      saving,
      error,
      fetchOrdenes,
      createOrden,
      updateOrden,
      setOrdenes,
    };
  }, [ordenes, loading, saving, error, fetchOrdenes, createOrden, updateOrden]);

  return <OrdenesContext.Provider value={value}>{children}</OrdenesContext.Provider>;
}

export function useOrdenes() {
  const ctx = useContext(OrdenesContext);
  if (!ctx) throw new Error("useOrdenes debe usarse dentro de <OrdenesProvider>.");
  return ctx;
}

