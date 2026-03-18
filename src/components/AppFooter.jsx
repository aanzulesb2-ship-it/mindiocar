"use client";

import { usePathname } from "next/navigation";

export default function AppFooter() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <footer className="bg-stone-100 border-t border-stone-200 mt-12">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center text-stone-600 text-sm">
          <p>&copy; 2026 Rectificadora Mindiocar. Todos los derechos reservados.</p>
          <p className="mt-2">Sistema de gestión desarrollado para optimizar procesos de rectificación de motores.</p>
          <p className="mt-2 text-stone-500">Versión 1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
