"use client";

import { Menu, Search } from "lucide-react";

export default function Topbar({ onOpenSidebar }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden p-2 rounded-xl border border-stone-200 hover:bg-stone-50"
            onClick={onOpenSidebar}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="leading-tight">
            <div className="font-black tracking-tight text-stone-900">Rectificadora Mindiocar</div>
            <div className="text-xs text-stone-500 -mt-0.5">Sistema de gestión • V2</div>
          </div>
        </div>

        {/* Search (placeholder V2) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border border-stone-200 bg-white shadow-sm w-[420px]">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            className="w-full outline-none text-sm"
            placeholder="Buscar orden, cliente, motor... (V2)"
            onChange={() => {}}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-2xl border border-stone-200 bg-white shadow-sm text-sm font-semibold">
            Grupo Mindiocar
          </div>
        </div>
      </div>
    </header>
  );
}

