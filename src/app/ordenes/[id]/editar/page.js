'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, Save, X } from 'lucide-react'
import MotorAutocompleteInput from '@/components/MotorAutocompleteInput'
import { useMotoresCatalog } from '@/hooks/useMotoresCatalog'
import { formatOrdenCode } from '@/lib/ordenesDisplay'

const TIPO_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'industrial', label: 'Industrial' },
]

function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function normalizeTaskList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }

  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeTaskList(tasks) {
  return tasks.map((item) => String(item || '').trim()).filter(Boolean).join('\n')
}

function normalizePhotoArray(value) {
  return Array.isArray(value) ? value.filter((item) => item?.path || item?.url) : []
}

function safeExt(name) {
  const ext = (String(name || '').split('.').pop() || 'jpg').toLowerCase()
  const clean = ext.replace(/[^a-z0-9]/g, '')
  return clean || 'jpg'
}

async function uploadMany({ bucket, ordenId, files }) {
  const uploaded = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = safeExt(file?.name)
    const path = `${ordenId}/${Date.now()}_${i}_${Math.random().toString(16).slice(2)}.${ext}`

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file?.type || 'image/jpeg',
    })

    if (error) throw error
    uploaded.push(path)
  }

  return uploaded
}

function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || null
}

export default function EditarOrden() {
  const router = useRouter()
  const params = useParams()
  const { motores, addMotor } = useMotoresCatalog()

  const [orden, setOrden] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [taskInput, setTaskInput] = useState('')
  const [newBlockFiles, setNewBlockFiles] = useState([])
  const [newCabezoteFiles, setNewCabezoteFiles] = useState([])
  const [ordenCode, setOrdenCode] = useState('000')
  const [formData, setFormData] = useState({
    cliente: '',
    mecanico_dueno: '',
    cedula_dueno: '',
    motor: '',
    serie_motor: '',
    tipo_motor: 'gasolina',
    prioridad: 'media',
    fecha_estimada: todayLocal(),
    estado: 'pendiente',
    tareas: [],
    datos_vino_detalle: '',
    fotos_block: [],
    fotos_cabezote: [],
  })

  const totalFotos = useMemo(
    () =>
      (formData.fotos_block?.length || 0) +
      (formData.fotos_cabezote?.length || 0) +
      newBlockFiles.length +
      newCabezoteFiles.length,
    [formData.fotos_block, formData.fotos_cabezote, newBlockFiles, newCabezoteFiles]
  )

  useEffect(() => {
    const fetchOrden = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error(error)
        alert('Error al cargar la orden')
        setLoading(false)
        return
      }

      setOrden(data)
      const { data: allRows } = await supabase
        .from('ordenes')
        .select('id, created_at')
        .order('created_at', { ascending: true })

      if (Array.isArray(allRows)) {
        const index = allRows.findIndex((row) => row.id === params.id)
        setOrdenCode(String(index + 1).padStart(3, '0'))
      }

      setFormData({
        cliente: data.cliente || '',
        mecanico_dueno: data.mecanico_dueno || '',
        cedula_dueno: data.cedula_dueno || '',
        motor: data.motor || '',
        serie_motor: data.serie_motor || '',
        tipo_motor: data.tipo_motor || 'gasolina',
        prioridad: data.prioridad || 'media',
        fecha_estimada: String(data.fecha_estimada || '').slice(0, 10) || todayLocal(),
        estado: data.estado || 'pendiente',
        tareas: normalizeTaskList(data.observaciones),
        datos_vino_detalle: data.datos_vino_detalle || '',
        fotos_block: normalizePhotoArray(data.fotos_block),
        fotos_cabezote: normalizePhotoArray(data.fotos_cabezote),
      })
      setLoading(false)
    }

    if (params.id) {
      fetchOrden()
    }
  }, [params.id])

  const addTask = () => {
    const task = taskInput.trim()
    if (!task) return

    setFormData((prev) => ({
      ...prev,
      tareas: [...prev.tareas, task],
    }))
    setTaskInput('')
  }

  const removeTask = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tareas: prev.tareas.filter((_, index) => index !== indexToRemove),
    }))
  }

  const onPick = (setter, max) => (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > max) {
      alert(`Maximo ${max} fotos permitidas por carga`)
      return
    }
    setter(files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const ordenId = params.id
      let fotosBlock = [...formData.fotos_block]
      let fotosCabezote = [...formData.fotos_cabezote]

      if (newBlockFiles.length) {
        const paths = await uploadMany({
          bucket: 'ordenes-fotos-block',
          ordenId,
          files: newBlockFiles,
        })

        fotosBlock = [
          ...fotosBlock,
          ...paths.map((path) => ({
            bucket: 'ordenes-fotos-block',
            path,
            url: getPublicUrl('ordenes-fotos-block', path),
          })),
        ]
      }

      if (newCabezoteFiles.length) {
        const paths = await uploadMany({
          bucket: 'ordenes-fotos-cabezote',
          ordenId,
          files: newCabezoteFiles,
        })

        fotosCabezote = [
          ...fotosCabezote,
          ...paths.map((path) => ({
            bucket: 'ordenes-fotos-cabezote',
            path,
            url: getPublicUrl('ordenes-fotos-cabezote', path),
          })),
        ]
      }

      const { error } = await supabase
        .from('ordenes')
        .update({
          cliente: formData.cliente || null,
          mecanico_dueno: formData.mecanico_dueno || null,
          cedula_dueno: formData.cedula_dueno || null,
          motor: formData.motor || null,
          serie_motor: formData.serie_motor || null,
          tipo_motor: formData.tipo_motor || null,
          prioridad: formData.prioridad || 'media',
          fecha_estimada: formData.fecha_estimada || todayLocal(),
          estado: formData.estado || 'pendiente',
          observaciones: serializeTaskList(formData.tareas),
          datos_vino_detalle: formData.datos_vino_detalle || null,
          fotos_block: fotosBlock,
          fotos_cabezote: fotosCabezote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      if (error) throw error
      if (formData.motor) addMotor(formData.motor)

      alert('Orden actualizada correctamente')
      router.push(`/gestor/${params.id}`)
    } catch (error) {
      console.error(error)
      alert(`Error al actualizar la orden: ${error?.message || 'desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>
  }

  if (!orden) {
    return <div className="flex justify-center items-center min-h-screen">Orden no encontrada</div>
  }

  return (
    <ProtectedRoute requiredRole={['admin', 'tecnico']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={18} />
            Atras
          </button>
          <h1 className="text-2xl font-bold text-stone-800">Editar {formatOrdenCode(ordenCode)}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Cliente</label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Mecanico / Dueno</label>
                <input
                  type="text"
                  value={formData.mecanico_dueno}
                  onChange={(e) => setFormData({ ...formData, mecanico_dueno: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Cedula</label>
                <input
                  type="text"
                  value={formData.cedula_dueno}
                  onChange={(e) => setFormData({ ...formData, cedula_dueno: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <MotorAutocompleteInput
                label="Motor"
                value={formData.motor}
                onChange={(value) => setFormData({ ...formData, motor: value })}
                motores={motores}
                placeholder="Busca o escribe un motor"
              />

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Serie del motor</label>
                <input
                  type="text"
                  value={formData.serie_motor}
                  onChange={(e) => setFormData({ ...formData, serie_motor: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Tipo</label>
                <select
                  value={formData.tipo_motor}
                  onChange={(e) => setFormData({ ...formData, tipo_motor: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {TIPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Prioridad</label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha_estimada}
                  readOnly
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en proceso">En proceso</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Tareas</label>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTask()
                  }
                }}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Escribe una tarea y presiona Enter"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.tareas.length ? (
                  formData.tareas.map((task, index) => (
                    <span
                      key={`${task}-${index}`}
                      className="inline-flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                    >
                      <span>{task}</span>
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="rounded-full text-red-700 hover:text-red-900"
                        aria-label={`Eliminar tarea ${task}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-stone-400">Aun no has agregado tareas.</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Detalle / novedades</label>
              <textarea
                value={formData.datos_vino_detalle}
                onChange={(e) => setFormData({ ...formData, datos_vino_detalle: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Notas adicionales de recepcion o del trabajo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-stone-200 p-4">
                <div className="font-semibold text-stone-800">Fotos Block</div>
                <div className="text-xs text-stone-500 mt-1">
                  Guardadas: {formData.fotos_block.length} | Nuevas: {newBlockFiles.length}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPick(setNewBlockFiles, 12)}
                  className="mt-3 w-full"
                />
                {formData.fotos_block.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {formData.fotos_block.map((foto, index) => (
                      <img
                        key={`${foto.path || foto.url}-${index}`}
                        src={foto.url}
                        alt={`Block ${index + 1}`}
                        className="h-20 w-full rounded-lg border border-stone-200 object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-stone-200 p-4">
                <div className="font-semibold text-stone-800">Fotos Cabezote</div>
                <div className="text-xs text-stone-500 mt-1">
                  Guardadas: {formData.fotos_cabezote.length} | Nuevas: {newCabezoteFiles.length}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPick(setNewCabezoteFiles, 12)}
                  className="mt-3 w-full"
                />
                {formData.fotos_cabezote.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {formData.fotos_cabezote.map((foto, index) => (
                      <img
                        key={`${foto.path || foto.url}-${index}`}
                        src={foto.url}
                        alt={`Cabezote ${index + 1}`}
                        className="h-20 w-full rounded-lg border border-stone-200 object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-xs text-stone-500">Total de fotos entre guardadas y nuevas: {totalFotos}</div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
}
