"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  addMotorToCatalog,
  deleteMotorFromCatalog,
  mergeMotoresCatalog,
  motoresCatalogEventName,
  normalizeMotorName,
  readMotoresCatalog,
  renameMotorInCatalog,
} from "@/lib/motoresCatalog";

export function useMotoresCatalog() {
  const [motores, setMotores] = useState([]);
  const [loadingMotores, setLoadingMotores] = useState(true);

  const refreshMotores = useCallback(() => {
    setMotores(readMotoresCatalog());
  }, []);

  const bootstrapMotores = useCallback(async () => {
    setLoadingMotores(true);
    refreshMotores();

    try {
      const { data } = await supabase.from("ordenes").select("motor");
      const fromOrdenes = Array.isArray(data)
        ? data.map((row) => normalizeMotorName(row?.motor)).filter(Boolean)
        : [];
      const merged = mergeMotoresCatalog(fromOrdenes);
      setMotores(merged);
    } catch {
      setMotores(readMotoresCatalog());
    } finally {
      setLoadingMotores(false);
    }
  }, [refreshMotores]);

  useEffect(() => {
    bootstrapMotores();

    const onStorage = (event) => {
      if (!event?.key || event.key === "mindiocar_motor_catalog_v1") refreshMotores();
    };
    const onUpdate = () => refreshMotores();

    window.addEventListener("storage", onStorage);
    window.addEventListener(motoresCatalogEventName(), onUpdate);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(motoresCatalogEventName(), onUpdate);
    };
  }, [bootstrapMotores, refreshMotores]);

  const addMotor = useCallback((name) => {
    const next = addMotorToCatalog(name);
    setMotores(next);
    return next;
  }, []);

  const renameMotor = useCallback((oldName, nextName) => {
    const next = renameMotorInCatalog(oldName, nextName);
    setMotores(next);
    return next;
  }, []);

  const deleteMotor = useCallback((name) => {
    const next = deleteMotorFromCatalog(name);
    setMotores(next);
    return next;
  }, []);

  const searchMotores = useCallback(
    (query) => {
      const q = normalizeMotorName(query).toLowerCase();
      if (!q) return motores;
      return motores.filter((motor) => motor.toLowerCase().includes(q));
    },
    [motores]
  );

  return useMemo(
    () => ({
      motores,
      loadingMotores,
      refreshMotores,
      addMotor,
      renameMotor,
      deleteMotor,
      searchMotores,
    }),
    [motores, loadingMotores, refreshMotores, addMotor, renameMotor, deleteMotor, searchMotores]
  );
}
