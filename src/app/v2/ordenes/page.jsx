"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function V2Ordenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [form, setForm] = useState({
    cliente: "",
    motor: "",
    prioridad: "media",
    fecha_estimada: "",
    observaciones: "",
  });

  async function cargar() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/v2/ordenes-trabajo", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Error cargando órdenes");
      setOrdenes(Array.isArray(j?.ordenes) ? j.ordenes : []);
    } catch (e) {
      setErr(`(Modo demo) API no disponible: ${e.message}`);
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setErr(null);

    if (!form.cliente.trim() || !form.motor.trim()) {
      setErr("Falta Cliente y Motor.");
      return;
    }

    try {
      const r = await fetch("/api/v2/ordenes-trabajo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "No se pudo crear");

      setForm({ cliente: "", motor: "", prioridad: "media", fecha_estimada: "", observaciones: "" });
      await cargar();
    } catch (e) {
      const fake = {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...form,
        estado: "pendiente",
      };
      setOrdenes((prev) => [fake, ...prev]);
      setForm({ cliente: "", motor: "", prioridad: "media", fecha_estimada: "", observaciones: "" });
      setErr(`(Modo demo) No se pudo guardar en la API. Se creó local: ${e.message}`);
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-black">V2  Órdenes de trabajo</h1>

          <div className="flex gap-2 flex-wrap">
            <Link href="/v2" className="px-3 py-2 rounded-xl border bg-white font-semibold">
              Inicio V2
            </Link>
            <Link href="/gestor" className="px-3 py-2 rounded-xl border bg-white font-semibold">
              Volver a V1
            </Link>
          </div>
        </div>

        {err ? (
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">{err}</div>
        ) : null}

        <form onSubmit={crear} className="bg-white p-5 rounded-2xl border shadow space-y-3">
          <div className="font-black">Crear nueva orden</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="Cliente"
              value={form.cliente}
              onChange={(e) => setForm((s) => ({ ...s, cliente: e.target.value }))}
            />
            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="Motor"
              value={form.motor}
              onChange={(e) => setForm((s) => ({ ...s, motor: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="px-3 py-2 rounded-xl border"
              value={form.prioridad}
              onChange={(e) => setForm((s) => ({ ...s, prioridad: e.target.value }))}
            >
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>

            <input
              type="date"
              className="px-3 py-2 rounded-xl border"
              value={form.fecha_estimada}
              onChange={(e) => setForm((s) => ({ ...s, fecha_estimada: e.target.value }))}
            />

            <button className="px-3 py-2 rounded-xl bg-red-600 text-white font-black">Crear orden</button>
          </div>

          <textarea
            className="w-full px-3 py-2 rounded-xl border"
            rows={3}
            placeholder="Observaciones"
            value={form.observaciones}
            onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
          />
        </form>

        <div className="bg-white p-5 rounded-2xl border shadow">
          <div className="font-black mb-3">Listado</div>

          {loading ? (
            <div className="text-stone-500">Cargando...</div>
          ) : ordenes.length === 0 ? (
            <div className="text-stone-500">No hay órdenes aún.</div>
          ) : (
            <div className="space-y-2">
              {ordenes.map((o) => (
                <Link key={o.id} href={`/v2/ordenes/${o.id}`} className="block p-3 rounded-xl border hover:bg-stone-50">
                  <div className="font-black">{o.cliente || ""}  {o.motor || ""}</div>
                  <div className="text-sm text-stone-500">Prioridad: {o.prioridad || "media"}  Estado: {o.estado || "pendiente"}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}