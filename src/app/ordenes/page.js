'use client'
import { LucideSearch, LucideRefreshCcw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { useAuth } from '@/components/AuthContext';
import { useOrdenes } from '@/components/OrdenesContext';
import { matchesOrdenSearch } from '@/lib/ordenesSearch';
export default function ListaOrdenes() {
  const router = useRouter()
  const { role } = useAuth();const { ordenes, updateOrden, loading } = useOrdenes();
  const [search, setSearch] = useState("")
  console.log('Render ListaOrdenes', { ordenes, loading });

  const filteredOrdenes = useMemo(
    () => (Array.isArray(ordenes) ? ordenes.filter((orden) => matchesOrdenSearch(orden, search)) : []),
    [ordenes, search]
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-lg text-red-600">Cargando órdenes...</div>;
  }
  return (
    <div className="bg-white/95 rounded-2xl shadow-xl p-6 md:p-10 max-w-5xl mx-auto mt-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 px-4 py-2 text-stone-600 hover:text-red-600 font-bold rounded-lg bg-stone-100 hover:bg-red-50 transition-all shadow-sm"
      >
        <ArrowLeft size={18} />
        Atrás
      </button>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter drop-shadow-sm">Motores en Taller</h2>
          <p className="text-red-600 text-xs font-bold uppercase tracking-widest mt-1">Control de producción activa</p>
        </div>
        {/* Buscador Rápido */}
        <div className="relative w-full md:w-72">
          <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por motor, mecanico, fecha o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-100 shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="py-4 text-[11px] font-black text-stone-400 uppercase tracking-widest">Orden #</th>
              <th className="py-4 text-[11px] font-black text-stone-400 uppercase tracking-widest">Cliente</th>
              <th className="py-4 text-[11px] font-black text-stone-400 uppercase tracking-widest">Motor</th>
              <th className="py-4 text-[11px] font-black text-stone-400 uppercase tracking-widest">Estado</th>
              <th className="py-4 text-[11px] font-black text-stone-400 uppercase tracking-widest">Acción</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredOrdenes.map((orden) => (
              <tr key={orden.id} className="border-b border-stone-50 hover:bg-red-50/40 transition-colors group">
                <td className="py-4 font-bold text-stone-800 group-hover:text-red-600 transition-colors">#{orden.id}</td>
                <td className="py-4 text-stone-600 font-medium">{orden.cliente}</td>
                <td className="py-4 text-stone-600 font-medium">{orden.motor}</td>
                <td className="py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    orden.estado === 'En Proceso' ? 'bg-amber-100 text-amber-700' : 
                    orden.estado === 'Completado' ? 'bg-green-100 text-green-700' : 
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {orden.estado}
                  </span>
                </td>
                <td className="py-4 flex gap-2">
                  {/* Botón para marcar como realizada (solo técnicos y admins) */}
                  <button 
                    onClick={() => updateOrden(orden.id, { estado: orden.estado === 'Pendiente' ? 'En Proceso' : orden.estado === 'En Proceso' ? 'Completado' : 'Pendiente' })}
                    className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    title="Marcar como realizada"
                  >
                    <LucideRefreshCcw size={18} />
                  </button>
                  {/* Solo admins pueden editar y facturar */}
                  {role !== 'tecnico' && (
                    <>
                      <button 
                        onClick={() => router.push(`/ordenes/${orden.id}/editar`)}
                        className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                      >
                        <LucideSearch size={18} />
                      </button>
                      <button
                        onClick={() => router.push(`/facturacion/nueva-factura?orden_id=${orden.id}&total=${orden.precio || 0}`)}
                        className="p-2 text-stone-400 hover:text-green-600 transition-colors"
                        title="Generar Factura"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0A9 9 0 11 3 12a9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}




