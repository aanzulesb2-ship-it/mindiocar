"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function FloatingHome() {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white shadow-xl border border-stone-200 hover:shadow-2xl transition font-bold"
        title="Ir al menu principal"
      >
        <Home size={18} />
        Menu
      </Link>
    </div>
  );
}
