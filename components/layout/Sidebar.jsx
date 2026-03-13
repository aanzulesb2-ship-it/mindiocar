"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wrench, Users, FileText, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gestor", label: "Órdenes", icon: Wrench },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/facturacion", label: "Facturación", icon: FileText },
  { href: "/analitica", label: "Analítica", icon: BarChart3 },
];

function NavItem({ href, label, icon: Icon, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 px-3 py-2 rounded-2xl font-semibold transition",
        active
          ? "bg-red-600 text-white shadow"
          : "text-stone-700 hover:bg-stone-100",
      ].join(" ")}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-stone-200 p-4">
      <div className="mb-4">
        <div className="font-black text-xl tracking-tight">Rectificadora Mindiocar</div>
        <div className="text-xs text-stone-500">Panel principal • V2</div>
      </div>

      <div className="space-y-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <NavItem
              key={item.href}
              {...item}
              active={active}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>

      <div className="mt-6 p-3 rounded-2xl border border-stone-200 bg-stone-50">
        <div className="text-sm font-bold">Modo V2</div>
        <div className="text-xs text-stone-600 mt-1">
          Diseño unificado + base para búsqueda global, roles y demo.
        </div>
      </div>
    </aside>
  );
}

