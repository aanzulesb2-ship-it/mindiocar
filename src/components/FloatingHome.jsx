"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function FloatingHome() {
  const router = useRouter();

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.replace("/login");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white shadow-xl border border-stone-200 hover:shadow-2xl transition font-bold"
        title="Ir al menú principal"
      >
        <Home size={18} />
        Menú
      </Link>

      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-brand-red border border-red-200 shadow-xl hover:bg-red-50 transition font-bold"
        title="Cerrar sesión"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </div>
  );
}
