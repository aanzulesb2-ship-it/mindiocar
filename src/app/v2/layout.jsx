"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const NAV = [
  { href: "/v2", label: "Inicio" },
  { href: "/v2/ordenes", label: "Órdenes" },
  { href: "/v2/tareas", label: "Tareas" },
  { href: "/v2/tecnicos", label: "Técnicos" },
  { href: "/v2/inventario", label: "Inventario" },
  { href: "/v2/bandeja", label: "Bandeja" },
  { href: "/gestor", label: "Volver a V1" },
];

export default function V2Layout({ children }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-stone-50">
        <div className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center">
                V2
              </div>
              <div>
                <div className="font-black text-stone-900 leading-tight">Rectificadora Mindiocar</div>
                <div className="text-xs text-stone-500 -mt-0.5">Panel Operativo • Segunda versión</div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {NAV.map((it) => {
                const active = pathname === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={[
                      "px-3 py-2 rounded-xl border text-sm font-bold transition",
                      active
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white hover:bg-stone-50 border-stone-200 text-stone-800",
                    ].join(" ")}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
