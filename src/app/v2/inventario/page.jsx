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

const DEFAULT_ITEMS = [
  { id: "camisa_75x83", nombre: "Camisa", medida: "75x83", stock: 100, tipo: "repuesto" },
  { id: "guia_std", nombre: "Guía", medida: "STD", stock: 50, tipo: "repuesto" },
  { id: "barra_hierro_1", nombre: "Barra hierro", medida: "1 pulgada", stock: 20, tipo: "material" },
];

export default function V2InventarioPage() {
  const [items, setItems] = useState([]);
  const [movs, setMovs] = useState([]);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    itemId: "",
    cantidad: 1,
    orden_id: "",
    mecanico: "",
    tecnico: "",
    nota: "",
  });

  useEffect(() => {
    const list = loadLS("v2_inventario_items", DEFAULT_ITEMS);
    const m = loadLS("v2_inventario_movs", []);
    setItems(Array.isArray(list) ? list : DEFAULT_ITEMS);
    setMovs(Array.isArray(m) ? m : []);
  }, []);

  useEffect(() => saveLS("v2_inventario_items", items), [items]);
  useEffect(() => saveLS("v2_inventario_movs", movs), [movs]);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      [it.nombre, it.medida, it.tipo].some((x) => String(x || "").toLowerCase().includes(s))
    );
  }, [items, q]);

  function sacar(e) {
    e.preventDefault();
    const itemId = form.itemId;
    const qty = Number(form.cantidad || 0);

    if (!itemId) return alert("Selecciona un item.");
    if (!qty || qty <= 0) return alert("Cantidad inválida.");

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const next = Math.max(0, Number(it.stock || 0) - qty);
        return { ...it, stock: next };
      })
    );

    const item = items.find((x) => x.id === itemId);
    const mov = {
      id: "mov_" + Date.now(),
      created_at: new Date().toISOString(),
      tipo: "salida",
      item_id: itemId,
      item_nombre: item?.nombre || "",
      item_medida: item?.medida || "",
      cantidad: qty,
      orden_id: form.orden_id || null,
      mecanico: form.mecanico || null,
      tecnico: form.tecnico || null,
      nota: form.nota || null,
    };

    setMovs((prev) => [mov, ...prev]);
    setForm({ itemId: "", cantidad: 1, orden_id: "", mecanico: "", tecnico: "", nota: "" });
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="bg-white border border-stone-200 rounded-2xl shadow p-6">
          <h1 className="text-3xl font-black">V2 • Inventario / Bodega</h1>
          <p className="text-stone-600 mt-1">
            Modo demo: controla entradas/salidas por item y medida. Luego conectamos a base real.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5 space-y-3">
          <div className="font-black">Sacar de bodega</div>

          <form onSubmit={sacar} className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <select
              className="px-3 py-2 rounded-xl border md:col-span-2"
              value={form.itemId}
              onChange={(e) => setForm((s) => ({ ...s, itemId: e.target.value }))}
            >
              <option value="">Selecciona repuesto/material…</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.nombre} • {it.medida} • Stock: {it.stock}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="px-3 py-2 rounded-xl border"
              value={form.cantidad}
              onChange={(e) => setForm((s) => ({ ...s, cantidad: e.target.value }))}
              min={1}
            />

            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="Orden ID (opcional)"
              value={form.orden_id}
              onChange={(e) => setForm((s) => ({ ...s, orden_id: e.target.value }))}
            />

            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="Mecánico (opcional)"
              value={form.mecanico}
              onChange={(e) => setForm((s) => ({ ...s, mecanico: e.target.value }))}
            />

            <button className="px-3 py-2 rounded-xl bg-red-600 text-white font-black">
              Registrar salida
            </button>

            <input
              className="px-3 py-2 rounded-xl border md:col-span-6"
              placeholder="Nota (opcional)"
              value={form.nota}
              onChange={(e) => setForm((s) => ({ ...s, nota: e.target.value }))}
            />
          </form>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-black">Items</div>
            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="mt-3 space-y-2">
            {filtrados.map((it) => (
              <div key={it.id} className="p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-black">{it.nombre} • {it.medida}</div>
                  <div className="text-xs text-stone-600">Tipo: {it.tipo} • ID: <span className="font-mono">{it.id}</span></div>
                </div>
                <div className="text-lg font-black">{it.stock}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow p-5">
          <div className="font-black mb-3">Movimientos (últimos {Math.min(30, movs.length)})</div>
          {movs.length === 0 ? (
            <div className="text-stone-500">Aún no hay movimientos.</div>
          ) : (
            <div className="space-y-2">
              {movs.slice(0, 30).map((m) => (
                <div key={m.id} className="p-3 rounded-xl border">
                  <div className="text-xs text-stone-600">
                    {m.created_at} • {m.tipo} • {m.item_nombre} {m.item_medida} • Cant: <span className="font-black">{m.cantidad}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Orden: <span className="font-mono">{m.orden_id || "—"}</span> • Mecánico: {m.mecanico || "—"} • Técnico: {m.tecnico || "—"}
                  </div>
                  {m.nota ? <div className="text-sm mt-1">{m.nota}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}