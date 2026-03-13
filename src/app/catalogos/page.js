'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Upload, Download, ArrowLeft, X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PdfViewer from '@/components/PdfViewer'

export default function Catalogos() {
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [fileType, setFileType] = useState('catalogos') // 'catalogos' o 'guias'
  const [search, setSearch] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      const { data, error } = await supabase.storage.from(fileType).list()
      if (error) console.error(error)
      else setFiles(data || [])
    }
    fetchFiles()
  }, [fileType])

  const loadFiles = async () => {
    const { data, error } = await supabase.storage.from(fileType).list()
    if (error) console.error(error)
    else setFiles(data || [])
  }

  const uploadFile = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    const { data, error } = await supabase.storage
      .from(fileType)
      .upload(file.name, file)

    if (error) console.error(error)
    else loadFiles()
    setUploading(false)
  }

  const openPdf = async (fileName) => {
    // Obtener URL pública del PDF
    const { data } = supabase.storage.from(fileType).getPublicUrl(fileName);
    if (data?.publicUrl) {
      setPdfUrl(data.publicUrl);
    } else {
      alert('No se pudo obtener el PDF');
    }
  }

  const deleteFile = async (fileName) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) return

    const { error } = await supabase.storage
      .from(fileType)
      .remove([fileName])

    if (error) {
      console.error(error)
      alert('Error al eliminar el archivo')
    } else {
      loadFiles()
      alert('Archivo eliminado correctamente')
    }
  }

  return (
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
            {fileType === 'catalogos' ? 'Catálogos de Medidas' : 'Guías de Medidas de Taller'}
          </h2>
          <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest">
            {fileType === 'catalogos' ? 'Documentos técnicos y especificaciones' : 'Guías prácticas para rectificación'}
          </p>
        </div>

        {/* Selector de tipo */}
        <div className="flex gap-2">
          <button
            onClick={() => setFileType('catalogos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              fileType === 'catalogos' 
                ? 'bg-red-600 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Catálogos
          </button>
          <button
            onClick={() => setFileType('guias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              fileType === 'guias' 
                ? 'bg-red-600 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Guías de Taller
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <label className="btn-mindiocar py-3 px-6 text-xs cursor-pointer">
          <Upload size={18} />
          Subir {fileType === 'catalogos' ? 'PDF' : 'Archivo'}
          <input 
            type="file" 
            accept={fileType === 'catalogos' ? '.pdf' : '.pdf,image/*'} 
            onChange={uploadFile} 
            className="hidden" 
          />
        </label>
      </div>

      {/* Buscador de archivos */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar PDF..."
            className="pl-10 pr-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-red-500 focus:border-transparent w-full"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files
          .filter(file => file.name.toLowerCase().includes(search.toLowerCase()))
          .map((file) => (
          <div key={file.name} className="p-6 bg-white border border-stone-100 rounded-4xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-8 h-8 text-red-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-stone-800 truncate">{file.name}</h3>
                  <p className="text-stone-400 text-xs">PDF • {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => deleteFile(file.name)}
                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar archivo"
              >
                <X size={16} />
              </button>
            </div>
            <button 
              onClick={() => openPdf(file.name)}
              className="w-full btn-mindiocar py-2 px-4 text-xs"
            >
              <FileText size={16} />
              Ver PDF
            </button>
          </div>
        ))}
      </div>

      {pdfUrl && <PdfViewer url={pdfUrl} onClose={() => setPdfUrl(null)} />}

      {uploading && <p className="text-center text-stone-600">Subiendo archivo...</p>}
    </div>
  )
}



