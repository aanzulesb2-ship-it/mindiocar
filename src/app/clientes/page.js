'use client'

// Debug: feedback de carga y logs
// Si usas loading de contexto, agrégalo aquí
// console.log('Render ClientesPage', { clientes, loading });
// if (loading) return <div className="flex justify-center items-center min-h-screen text-lg text-red-600">Cargando clientes...</div>;

import { useState, useEffect } from 'react'
import { LucideUserPlus, LucidePhone, LucideMail, LucideMapPin, ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function GestionClientes() {
  const router = useRouter()
  const { role } = useAuth()

  const [clientes, setClientes] = useState([])
  const [historialMotores, setHistorialMotores] = useState([])
  const [showHistorial, setShowHistorial] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newCliente, setNewCliente] = useState({
    nombre: '',
    empresa: '',
    telefono: '',
    email: '',
    ciudad: '',
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setClientes(data || [])
    }
    fetchClientes()
  }, [])

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setClientes(data || [])
  }

  const handleVerHistorial = async (clienteId) => {
    setShowHistorial(clienteId)
    setHistorialMotores([])

    // Buscar órdenes relacionadas a este cliente
    const { data, error } = await supabase.from('ordenes').select('*').eq('cliente', clienteId)
    if (error) {
      alert('Error al cargar historial de motores: ' + (error.message || JSON.stringify(error)))
      return
    }
    setHistorialMotores(data || [])
  }

  const handleEliminarCliente = async (clienteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) return
    setDeletingId(clienteId)

    const { error } = await supabase.from('clientes').delete().eq('id', clienteId)

    setDeletingId(null)
    if (error) {
      alert('No se pudo eliminar el cliente.\n\nDetalle: ' + (error.message || JSON.stringify(error)))
      return
    }

    alert('Cliente eliminado correctamente')
    loadClientes()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('clientes').insert([newCliente])

    if (error) {
      alert('No se pudo guardar el cliente.\n\nDetalle: ' + (error.message || JSON.stringify(error)))
      setLoading(false)
      return
    }

    alert('Cliente guardado exitosamente')
    setShowModal(false)
    setNewCliente({ nombre: '', empresa: '', telefono: '', email: '', ciudad: '' })
    await loadClientes()
    setLoading(false)
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="card-mindiocar">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 px-4 py-2 text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Atrás
        </button>

        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tighter">
              Directorio de Clientes
            </h2>
            <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest">
              Base de datos de aliados comerciales
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-mindiocar py-3 px-6 text-xs"
            disabled={role !== 'admin'}
          >
            <LucideUserPlus size={18} />
            Nuevo Cliente
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente por nombre, empresa, teléfono, email o ciudad..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clientes.filter(c => {
            const term = search.toLowerCase();
            return (
              c.nombre?.toLowerCase().includes(term) ||
              c.empresa?.toLowerCase().includes(term) ||
              c.telefono?.toLowerCase().includes(term) ||
              c.email?.toLowerCase().includes(term) ||
              c.ciudad?.toLowerCase().includes(term)
            );
          }).map((cliente) => (
            <div
              key={cliente.id}
              className="p-6 bg-white border border-stone-100 rounded-4xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-black text-stone-800 mb-1">{cliente.empresa}</h3>
              <p className="text-stone-400 text-xs font-bold uppercase mb-4">{cliente.nombre}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <LucidePhone size={16} className="text-red-500" />
                  <span>{cliente.telefono}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <LucideMail size={16} className="text-red-500" />
                  <span>{cliente.email}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <LucideMapPin size={16} className="text-red-500" />
                  <span>{cliente.ciudad}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-50 flex justify-between gap-2">
                <button
                  className="text-[10px] font-black text-red-600 uppercase hover:underline"
                  onClick={() => handleVerHistorial(cliente.id)}
                >
                  Ver historial de motores
                </button>

                <button
                  className="text-[10px] font-black text-stone-400 uppercase hover:text-red-600"
                  onClick={() => handleEliminarCliente(cliente.id)}
                  disabled={deletingId === cliente.id}
                >
                  {deletingId === cliente.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>

              {/* Historial de motores */}
              {showHistorial === cliente.id && (
                <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <h4 className="font-bold mb-2 text-stone-700">Historial de Motores</h4>

                  {historialMotores.length === 0 ? (
                    <div className="text-stone-400 text-sm">
                      No hay órdenes registradas para este cliente.
                    </div>
                  ) : (
                    <ul className="text-sm text-stone-700 space-y-4">
                      {historialMotores.map((orden) => (
                        <li key={orden.id} className="border-b border-stone-100 pb-2">
                          <div>
                            Motor: <span className="font-bold">{orden.motor}</span> | Serie: {orden.serie} | Estado: {orden.estado}
                          </div>
                          {/* Piezas seleccionadas */}
                          {orden.datos_vino && (
                            <div className="mt-1 text-xs text-stone-500">
                              Piezas: {Object.keys(typeof orden.datos_vino === 'string' ? JSON.parse(orden.datos_vino) : orden.datos_vino).filter(k => (typeof orden.datos_vino === 'string' ? JSON.parse(orden.datos_vino)[k] : orden.datos_vino[k])).join(', ') || '—'}
                            </div>
                          )}
                          {/* Fotos block */}
                          {orden.fotos_block && Array.isArray(orden.fotos_block) && orden.fotos_block.length > 0 && (
                            <div className="mt-2">
                              <div className="font-bold text-xs mb-1">Fotos Block</div>
                              <div className="grid grid-cols-3 gap-2">
                                {orden.fotos_block.map((ph, idx) => (
                                  <img
                                    key={ph.path || idx}
                                    src={ph.url}
                                    alt={`Block ${idx + 1}`}
                                    className="w-24 h-36 object-cover rounded-lg border border-stone-200"
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Fotos cabezote */}
                          {orden.fotos_cabezote && Array.isArray(orden.fotos_cabezote) && orden.fotos_cabezote.length > 0 && (
                            <div className="mt-2">
                              <div className="font-bold text-xs mb-1">Fotos Cabezote</div>
                              <div className="grid grid-cols-3 gap-2">
                                {orden.fotos_cabezote.map((ph, idx) => (
                                  <img
                                    key={ph.path || idx}
                                    src={ph.url}
                                    alt={`Cabezote ${idx + 1}`}
                                    className="w-24 h-36 object-cover rounded-lg border border-stone-200"
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    className="mt-3 text-xs text-blue-600 underline"
                    onClick={() => setShowHistorial(null)}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal para nuevo cliente */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-stone-800">Nuevo Cliente</h3>
                <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newCliente.nombre}
                    onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={newCliente.empresa}
                    onChange={(e) => setNewCliente({ ...newCliente, empresa: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newCliente.telefono}
                    onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCliente.email}
                    onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={newCliente.ciudad}
                    onChange={(e) => setNewCliente({ ...newCliente, ciudad: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}



