import Link from 'next/link';
import { FileText, Plus, Users, BarChart3, Home, Settings, FilePdf, Bot, Database } from 'lucide-react';


import { useAuth } from '../../components/AuthContext';

export default function Sidebar() {
  const { role } = useAuth();
  const menuItems = [
    { href: '/gestor', icon: FileText, label: 'Órdenes de trabajo' },
    { href: '/nueva-orden', icon: Plus, label: 'Crear ordenes' },
    { href: '/facturas', icon: BarChart3, label: 'Facturas' },
    { href: '/facturacion/nueva-factura', icon: Plus, label: 'Crear factura' },
    { href: '/pdf', icon: FilePdf, label: 'PDFs' },
    { href: '/motores', icon: Database, label: 'Motores' },
    { href: '/settings', icon: Settings, label: 'Configuración' },
    { href: '/asistente-ai', icon: Bot, label: 'Agente Mecánico' },
  ];

  const { signOut, user } = useAuth();
  return (
    <aside className="w-64 bg-white shadow-lg border-r border-stone-200 flex flex-col">
      <div className="p-6 border-b border-stone-200">
        <h2 className="text-xl font-bold text-stone-900">Rectificadora Mindiocar</h2>
        <p className="text-sm text-stone-600 mt-1">Sistema de Gestión</p>
      </div>

      <nav className="flex-1 p-4 grid grid-cols-1 gap-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-stone-50 hover:bg-red-50 border border-stone-200 rounded-xl shadow transition-colors text-stone-700 hover:text-red-700 font-semibold"
          >
            <item.icon className="w-8 h-8" />
            <span className="text-base">{item.label}</span>
          </Link>
        ))}
        {user && (
          <button
            onClick={signOut}
            className="w-14 h-14 flex items-center justify-center mt-2 bg-linear-to-br from-red-600 to-red-400 hover:from-red-700 hover:to-red-500 border-4 border-white rounded-full shadow-lg text-white"
            title="Cerrar sesión"
          >
            {/* Icono de encendido/apagado tipo on/off */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </nav>

      <div className="p-4 border-t border-stone-200">
        <p className="text-xs text-stone-500 text-center">v1.0 - Gestión Empresarial</p>
      </div>
    </aside>
  );
}


