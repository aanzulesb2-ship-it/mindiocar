"use client";

import Link from "next/link";

export default function V2Home() {
  const cards = [
    { href: "/v2/ordenes", title: "Órdenes", desc: "Crear y ver órdenes de trabajo V2." },
    { href: "/v2/tareas", title: "Tareas", desc: "Asignación por técnico, estados y porcentaje." },
    { href: "/v2/tecnicos", title: "Técnicos", desc: "Alta/baja de operarios y roles." },
    { href: "/v2/inventario", title: "Inventario", desc: "Bodega: entradas, salidas, medidas." },
    { href: "/v2/bandeja", title: "Bandeja", desc: "Mensajes de todos los mini-chats (admin)." },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-2xl shadow p-6">
        <h1 className="text-3xl font-black">V2  Panel Operativo</h1>
        <p className="text-stone-600 mt-1">
          Aquí armamos la segunda versión: tareas por técnico, mini-chat y bodega con control total.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white border border-stone-200 rounded-2xl shadow p-5 hover:bg-stone-50 transition"
          >
            <div className="text-xl font-black">{c.title}</div>
            <div className="text-sm text-stone-600 mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}