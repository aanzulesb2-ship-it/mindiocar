'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import MotorAutocompleteInput from '@/components/MotorAutocompleteInput'
import { useMotoresCatalog } from '@/hooks/useMotoresCatalog'

const VINO_ITEMS = [
  'Block', 'Base', 'Carter', 'Tapa valvulas', 'Tornilleria',
  'Pernos block', 'Pernos cabezote',
  'Cigueenal', 'Bielas', 'Pistones', 'Camisas',
  'Cojinetes bancada', 'Cojinetes biela', 'Metales empuje',
  'Arbol de levas', 'Taques', 'Balancines',
  'Cadena/correa', 'Tensor', 'Polea', 'Damper', 'Volante',
  'Culata/Cabezote', 'Valvulas', 'Resortes', 'Guias valvula', 'Sellos valvula',
  'Bomba de aceite', 'Bomba de agua',
  'Empaques', 'Retenes'
]

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function serializeTaskList(tasks) {
  return tasks.map((item) => String(item || '').trim()).filter(Boolean).join('\n')
}

export default function NuevaOrdenPage() {
  const router = useRouter()
  const { motores, addMotor } = useMotoresCatalog()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [taskInput, setTaskInput] = useState('')
  const [tasks, setTasks] = useState([])

  const [form, setForm] = useState({
    cliente: '',
    mecanico_dueno: '',
    cedula_dueno: '',
    motor: '',
    serie_motor: '',
    tipo_motor: 'gasolina',
    prioridad: 'media',
    fecha_estimada: todayLocal(),
    datos_vino: {},
    datos_vino_detalle: '',
  })

  const [blockFiles, setBlockFiles] = useState([])
  const [cabezoteFiles, setCabezoteFiles] = useState([])

  const vinoCols = useMemo(() => chunk(VINO_ITEMS, 5), [])

  useEffect(() => {
    setForm((prev) => {
      if (Object.keys(prev.datos_vino || {}).length) return prev
      const base = {}
      for (const item of VINO_ITEMS) base[item] = false
      return { ...prev, datos_vino: base }
    })
  }, [])

  const onPick = (setter, max) => (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > max) {
      alert(`Maximo ${max} fotos permitidas`)
      return
    }
    setter(files)
  }

  const toggleVino = (item) => {
    setForm((prev) => ({
      ...prev,
      datos_vino: { ...(prev.datos_vino || {}), [item]: !prev.datos_vino?.[item] },
    }))
  }

  const addTask = () => {
    const task = taskInput.trim()
    if (!task) return
    setTasks((prev) => [...prev, task])
    setTaskInput('')
  }

  const removeTask = (indexToRemove) => {
    setTasks((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)

    try {
      const insertPayload = {
        cliente: form.cliente || null,
        mecanico_dueno: form.mecanico_dueno || null,
        cedula_dueno: form.cedula_dueno || null,
        motor: form.motor || null,
        serie_motor: form.serie_motor || null,
        tipo_motor: form.tipo_motor || null,
        prioridad: form.prioridad || 'media',
        fecha_estimada: form.fecha_estimada || todayLocal(),
        observaciones: serializeTaskList(tasks) || null,
        datos_vino: form.datos_vino || {},
        datos_vino_detalle: form.datos_vino_detalle || null,
        estado: 'pendiente',
      }

      const { data: created, error: insErr } = await supabase
        .from('ordenes')
        .insert([insertPayload])
        .select('id')
        .single()

      if (insErr) throw insErr
      if (form.motor) addMotor(form.motor)
      const ordenId = created.id

      let fotosBlockPaths = []
      let fotosCabezotePaths = []

      if (blockFiles.length) {
        fotosBlockPaths = await uploadMany({
          bucket: 'ordenes-fotos-block',
          ordenId,
          files: blockFiles,
        })
      }

      if (cabezoteFiles.length) {
        fotosCabezotePaths = await uploadMany({
          bucket: 'ordenes-fotos-cabezote',
          ordenId,
          files: cabezoteFiles,
        })
      }

      const fotos_block = fotosBlockPaths.map((path) => ({
        bucket: 'ordenes-fotos-block',
        path,
        url: getPublicUrl('ordenes-fotos-block', path),
      }))

      const fotos_cabezote = fotosCabezotePaths.map((path) => ({
        bucket: 'ordenes-fotos-cabezote',
        path,
        url: getPublicUrl('ordenes-fotos-cabezote', path),
      }))

      if (fotos_block.length || fotos_cabezote.length) {
        const { error: upErr } = await supabase
          .from('ordenes')
          .update({ fotos_block, fotos_cabezote })
          .eq('id', ordenId)

        if (upErr) throw upErr
      }

      alert('Orden creada correctamente')
      router.replace(`/gestor/${ordenId}`)
    } catch (ex) {
      console.error(ex)
      setErr(ex?.message || 'Error creando la orden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute requiredRole={['admin', 'tecnico']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Nuevo Ingreso</h1>
            <p className="text-stone-500 text-sm">
              Crea la orden con datos, checklist de recepcion y fotos.
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white shadow-sm hover:shadow transition font-semibold"
          >
            Volver
          </button>
        </div>

        {err ? (
          <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <div className="font-black">Error</div>
            <div className="text-sm mt-1">{err}</div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Cliente</label>
                <input
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Nombre / Taller"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Mecanico / Dueno</label>
                <input
                  value={form.mecanico_dueno}
                  onChange={(e) => setForm({ ...form, mecanico_dueno: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Cedula</label>
                <input
                  value={form.cedula_dueno}
                  onChange={(e) => setForm({ ...form, cedula_dueno: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="0102030405"
                />
              </div>

              <MotorAutocompleteInput
                label="Motor"
                value={form.motor}
                onChange={(value) => setForm({ ...form, motor: value })}
                motores={motores}
                placeholder="Busca o escribe un motor"
              />

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Serie del motor</label>
                <input
                  value={form.serie_motor}
                  onChange={(e) => setForm({ ...form, serie_motor: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Serie / VIN motor"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Tipo</label>
                <select
                  value={form.tipo_motor}
                  onChange={(e) => setForm({ ...form, tipo_motor: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="gasolina">Gasolina</option>
                  <option value="diesel">Diesel</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Prioridad</label>
                <select
                  value={form.prioridad}
                  onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-stone-500">Fecha</label>
                <input
                  type="date"
                  value={form.fecha_estimada}
                  readOnly
                  className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-600"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-black uppercase tracking-widest text-stone-500">Tareas</label>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTask()
                  }
                }}
                className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Escribe una tarea y presiona Enter"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {tasks.length ? (
                  tasks.map((task, index) => (
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
                        x
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-stone-400">Aun no has agregado tareas.</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
            <div className="mb-4">
              <div className="text-lg font-black text-stone-900">Datos de recepcion</div>
              <div className="text-sm text-stone-500">
                Marca lo que vino con el motor. Abajo escribe novedades si aplica.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {vinoCols.map((col, idx) => (
                <div key={idx} className="space-y-2">
                  {col.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!form.datos_vino?.[item]}
                        onChange={() => toggleVino(item)}
                        className="h-4 w-4 accent-red-600"
                      />
                      <span className="text-sm text-stone-700">{item}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <label className="text-xs font-black uppercase tracking-widest text-stone-500">
                Detalle / novedades de piezas
              </label>
              <textarea
                rows={4}
                value={form.datos_vino_detalle}
                onChange={(e) => setForm({ ...form, datos_vino_detalle: e.target.value })}
                className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ej: bielas fundidas, faltan pernos, cigueenal rayado"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
              <div className="font-black text-stone-900">Fotos Block (max. 12)</div>
              <div className="text-sm text-stone-500 mb-3">Block, cigueenal, bielas, pistones, etc.</div>
              <input type="file" accept="image/*" multiple onChange={onPick(setBlockFiles, 12)} className="w-full" />
              {blockFiles.length ? (
                <div className="text-xs text-stone-500 mt-2">{blockFiles.length} foto(s) seleccionada(s)</div>
              ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
              <div className="font-black text-stone-900">Fotos Cabezote (max. 12)</div>
              <div className="text-sm text-stone-500 mb-3">Culata, valvulas, asientos, guias, etc.</div>
              <input type="file" accept="image/*" multiple onChange={onPick(setCabezoteFiles, 12)} className="w-full" />
              {cabezoteFiles.length ? (
                <div className="text-xs text-stone-500 mt-2">{cabezoteFiles.length} foto(s) seleccionada(s)</div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white shadow-sm hover:shadow transition font-semibold"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
