"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CheckCircle2, Pencil, Plus, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { formatOrdenCode } from "@/lib/ordenesDisplay";
import {
  buildTask,
  getOrdenProgress,
  parseDetailItems,
  parseTaskState,
  serializeDetailItems,
  serializeTaskState,
} from "@/lib/ordenTaskProgress";

const SECTION_META = {
  blockTasks: {
    title: "Block",
    section: "block",
    placeholder: "Ej: cepillado de block",
    showArmado: true,
  },
  cabezoteTasks: {
    title: "Cabezote",
    section: "cabezote",
    placeholder: "Ej: cepillado de cabezote",
    showArmado: true,
  },
  especialesTasks: {
    title: "Trabajos Especiales",
    section: "especiales",
    placeholder: "Ej: torno, soldaduras, ajustes especiales",
    showArmado: false,
  },
};

function toArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [];
}

function onlyChecked(datosVino) {
  if (!datosVino || typeof datosVino !== "object") return [];
  return Object.entries(datosVino)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

export default function GestorDetalleOrden() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [orden, setOrden] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [error, setError] = useState(null);
  const [ordenCode, setOrdenCode] = useState("000");
  const [taskState, setTaskState] = useState({
    blockTasks: [],
    cabezoteTasks: [],
    especialesTasks: [],
    armadoBlockDone: false,
    armadoCabezoteDone: false,
  });
  const [detailItems, setDetailItems] = useState([]);
  const [taskInputs, setTaskInputs] = useState({
    blockTasks: "",
    cabezoteTasks: "",
    especialesTasks: "",
  });
  const [detailInput, setDetailInput] = useState("");
  const [editingTask, setEditingTask] = useState({ sectionKey: null, taskId: null, text: "" });
  const [savingProgress, setSavingProgress] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const checkedItems = useMemo(() => onlyChecked(orden?.datos_vino), [orden]);
  const progress = useMemo(() => getOrdenProgress(taskState), [taskState]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setOrden(null);
      } else {
        setOrden(data);
        setTaskState(parseTaskState(data.observaciones));
        setDetailItems(parseDetailItems(data.datos_vino_detalle));
      }

      const { data: allRows } = await supabase
        .from("ordenes")
        .select("id, created_at")
        .order("created_at", { ascending: true });

      if (Array.isArray(allRows)) {
        const index = allRows.findIndex((row) => row.id === id);
        setOrdenCode(String(index + 1).padStart(3, "0"));
      }

      setLoading(false);
    };

    void load();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const loadFotos = async () => {
      setLoadingFotos(true);
      try {
        const res = await fetch(`/api/ordenes/${id}/fotos`, { method: "GET" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar fotos");
        setFotos(toArray(json?.fotos).filter((x) => x?.url));
      } catch (e) {
        console.error(e);
        setFotos([]);
      } finally {
        setLoadingFotos(false);
      }
    };

    void loadFotos();
  }, [id]);

  const fotosBlock = useMemo(
    () => fotos.filter((f) => (f?.categoria || "").toLowerCase().includes("block")),
    [fotos]
  );
  const fotosCabezote = useMemo(
    () => fotos.filter((f) => (f?.categoria || "").toLowerCase().includes("cabezote")),
    [fotos]
  );

  const persistOrdenProgress = async (nextTaskState, nextDetailItems = detailItems) => {
    setSavingProgress(true);

    const payload = {
      observaciones: serializeTaskState(nextTaskState),
      datos_vino_detalle: serializeDetailItems(nextDetailItems) || null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("ordenes").update(payload).eq("id", id);
    setSavingProgress(false);

    if (updateError) {
      console.error(updateError);
      alert(updateError.message || "No se pudo guardar el progreso.");
      return false;
    }

    setOrden((prev) => (prev ? { ...prev, ...payload } : prev));
    return true;
  };

  const updateTaskState = async (nextTaskState) => {
    const previous = taskState;
    setTaskState(nextTaskState);
    const ok = await persistOrdenProgress(nextTaskState);
    if (!ok) setTaskState(previous);
  };

  const handleToggleTask = async (sectionKey, taskId) => {
    const nextTaskState = {
      ...taskState,
      [sectionKey]: taskState[sectionKey].map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      ),
    };

    const section = SECTION_META[sectionKey]?.section;
    if (section === "block") nextTaskState.armadoBlockDone = false;
    if (section === "cabezote") nextTaskState.armadoCabezoteDone = false;

    await updateTaskState(nextTaskState);
  };

  const handleAddTask = async (sectionKey) => {
    const text = String(taskInputs[sectionKey] || "").trim();
    if (!text) return;

    const nextTaskState = {
      ...taskState,
      [sectionKey]: [...taskState[sectionKey], buildTask(text, SECTION_META[sectionKey].section)],
    };

    if (sectionKey === "blockTasks") nextTaskState.armadoBlockDone = false;
    if (sectionKey === "cabezoteTasks") nextTaskState.armadoCabezoteDone = false;

    setTaskInputs((prev) => ({ ...prev, [sectionKey]: "" }));
    await updateTaskState(nextTaskState);
  };

  const handleStartEditTask = (sectionKey, task) => {
    setEditingTask({ sectionKey, taskId: task.id, text: task.text });
  };

  const handleSaveTaskEdit = async () => {
    if (!editingTask.sectionKey || !editingTask.taskId || !editingTask.text.trim()) return;

    const nextTaskState = {
      ...taskState,
      [editingTask.sectionKey]: taskState[editingTask.sectionKey].map((task) =>
        task.id === editingTask.taskId ? { ...task, text: editingTask.text.trim() } : task
      ),
    };

    setEditingTask({ sectionKey: null, taskId: null, text: "" });
    await updateTaskState(nextTaskState);
  };

  const handleToggleArmado = async (section) => {
    const nextTaskState = { ...taskState };
    if (section === "block") {
      if (!progress.canToggleArmadoBlock) return;
      nextTaskState.armadoBlockDone = !taskState.armadoBlockDone;
    } else {
      if (!progress.canToggleArmadoCabezote) return;
      nextTaskState.armadoCabezoteDone = !taskState.armadoCabezoteDone;
    }
    await updateTaskState(nextTaskState);
  };

  const handleAddDetail = async () => {
    const detail = detailInput.trim();
    if (!detail) return;

    const previous = detailItems;
    const nextDetailItems = [...detailItems, detail];
    setDetailItems(nextDetailItems);
    setDetailInput("");

    const ok = await persistOrdenProgress(taskState, nextDetailItems);
    if (!ok) setDetailItems(previous);
  };

  const handleRemoveDetail = async (indexToRemove) => {
    const previous = detailItems;
    const nextDetailItems = detailItems.filter((_, index) => index !== indexToRemove);
    setDetailItems(nextDetailItems);

    const ok = await persistOrdenProgress(taskState, nextDetailItems);
    if (!ok) setDetailItems(previous);
  };

  const handleFinish = async () => {
    if (!progress.canFinalize) return;

    const ok = window.confirm("¿Marcar esta orden como COMPLETADA?");
    if (!ok) return;

    setFinishing(true);
    const { error: finishError } = await supabase
      .from("ordenes")
      .update({ estado: "completado", updated_at: new Date().toISOString() })
      .eq("id", id);
    setFinishing(false);

    if (finishError) {
      console.error(finishError);
      alert(finishError.message || "No se pudo finalizar.");
      return;
    }

    router.push("/gestor");
  };

  const sectionKeys = ["blockTasks", "cabezoteTasks"];
  const visibleHalfSections = sectionKeys.filter((sectionKey) => taskState[sectionKey].length > 0);
  const showSpeciales = taskState.especialesTasks.length > 0;

  if (loading) return <div className="p-6">Cargando orden...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!orden) return <div className="p-6">Orden no encontrada</div>;

  const renderTaskCard = (sectionKey) => {
    const meta = SECTION_META[sectionKey];
    const tasks = taskState[sectionKey];
    const isBlock = sectionKey === "blockTasks";
    const armadoDone = isBlock ? taskState.armadoBlockDone : taskState.armadoCabezoteDone;
    const canToggleArmado = isBlock ? progress.canToggleArmadoBlock : progress.canToggleArmadoCabezote;
    const isLocked = meta.showArmado && armadoDone;

    return (
      <div key={sectionKey} className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-black text-stone-900">{meta.title}</div>
          {meta.showArmado ? (
            <button
              type="button"
              onClick={() => handleToggleArmado(meta.section)}
              disabled={armadoDone || !canToggleArmado || savingProgress}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition disabled:opacity-50 ${
                armadoDone
                  ? "bg-emerald-600 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              <CheckCircle2 size={15} />
              {armadoDone ? "COMPLETADO" : "ARMADO"}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={taskInputs[sectionKey]}
            onChange={(e) => setTaskInputs((prev) => ({ ...prev, [sectionKey]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTask(sectionKey);
              }
            }}
            className="flex-1 px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder={meta.placeholder}
            disabled={isLocked}
          />
          <button
            type="button"
            onClick={() => handleAddTask(sectionKey)}
            disabled={isLocked}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
            aria-label={`Agregar tarea ${meta.title}`}
          >
            <Plus size={18} />
          </button>
        </div>

        {isLocked ? (
          <div className="mt-2 text-xs text-stone-500">
            Este bloque quedó completado. Para restaurar estas tareas, usa Editar orden.
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {tasks.map((task) => {
            const isEditing = editingTask.sectionKey === sectionKey && editingTask.taskId === task.id;

            return (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => handleToggleTask(sectionKey, task.id)}
                  disabled={isLocked}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    task.done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-white text-stone-500 hover:border-emerald-500"
                  } disabled:opacity-50`}
                  aria-label={task.done ? "Marcar tarea pendiente" : "Marcar tarea realizada"}
                >
                  <Check size={16} />
                </button>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTask.text}
                      onChange={(e) => setEditingTask((prev) => ({ ...prev, text: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveTaskEdit();
                        }
                      }}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  ) : (
                    <div className={`text-sm ${task.done ? "text-stone-400 line-through" : "text-stone-800"}`}>
                      {task.text}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveTaskEdit}
                      disabled={isLocked}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                      aria-label="Guardar tarea"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTask({ sectionKey: null, taskId: null, text: "" })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-500 hover:text-stone-800"
                      aria-label="Cancelar edición"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEditTask(sectionKey, task)}
                    disabled={isLocked}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-500 hover:text-stone-800 disabled:opacity-50"
                    aria-label={`Editar tarea ${task.text}`}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black">
            <span className="text-red-600">{formatOrdenCode(ordenCode)}</span>
            <span className="ml-3 text-stone-500 text-lg">#{ordenCode}</span>
          </h1>

          <div className="flex gap-2">
            <button onClick={() => router.back()} className="px-4 py-2 border rounded-xl">
              Volver
            </button>

            {role !== "tecnico" ? (
              <Link href={`/ordenes/${id}/editar`} className="px-4 py-2 bg-red-600 text-white rounded-xl">
                Editar
              </Link>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><b>Cliente:</b> {orden.cliente || "-"}</div>
          <div><b>Mecánico / Taller:</b> {orden.mecanico_dueno || "-"}</div>
          <div><b>Cédula:</b> {orden.cedula_dueno || "-"}</div>
          <div><b>Motor:</b> {orden.motor || "-"}</div>
          <div><b>Serie:</b> {orden.serie_motor || "-"}</div>
          <div><b>Tipo:</b> {orden.tipo_motor || "-"}</div>
          <div><b>Estado:</b> {orden.estado || "-"}</div>
          <div><b>Prioridad:</b> {orden.prioridad || "-"}</div>
          <div><b>Fecha:</b> {orden.fecha_estimada ? String(orden.fecha_estimada) : "-"}</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-black">Tareas</div>
              <div className="text-sm text-stone-500">
                {progress.completedTasks}/{progress.totalTasks} completadas
                {savingProgress ? " • guardando..." : ""}
              </div>
            </div>

            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-stone-500">
                <span>Progreso</span>
                <span>{Math.round(progress.totalProgress)}%</span>
              </div>
              <div className="mt-2 h-4 rounded-lg bg-stone-100 border border-stone-300 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress.totalProgress}%` }}
                />
              </div>
            </div>
          </div>

          {visibleHalfSections.length ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleHalfSections.map((sectionKey) => renderTaskCard(sectionKey))}
            </div>
          ) : (
            <p className="mt-4 text-stone-500">No hay tareas de block ni cabezote registradas.</p>
          )}

          {showSpeciales ? (
            <div className="mt-4">
              {renderTaskCard("especialesTasks")}
            </div>
          ) : null}

          {progress.canFinalize ? (
            <div className="mt-5 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleFinish}
                disabled={finishing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {finishing ? "Finalizando..." : "Finalizar"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="font-black">Datos de recepción</div>

          {checkedItems.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {checkedItems.map((it) => (
                <span
                  key={it}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {it}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-stone-500">No hay casillas marcadas.</div>
          )}

          <div className="mt-4">
            <div className="text-xs font-black uppercase tracking-widest text-stone-500">
              Detalles / novedades
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={detailInput}
                onChange={(e) => setDetailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDetail();
                  }
                }}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Agrega un detalle y presiona Enter"
              />
              <button
                type="button"
                onClick={handleAddDetail}
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-green-600 text-white hover:bg-green-700 transition"
                aria-label="Agregar detalle"
              >
                <Plus size={18} />
              </button>
            </div>

            {detailItems.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {detailItems.map((detail, index) => (
                  <span
                    key={`${detail}-${index}`}
                    className="inline-flex items-start gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800"
                  >
                    <span>{detail}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDetail(index)}
                      className="rounded-full text-stone-500 hover:text-stone-800"
                      aria-label={`Eliminar detalle ${detail}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-stone-500">Aún no hay detalles agregados.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-black">Fotos de la orden</div>
            {loadingFotos ? <div className="text-sm text-stone-500">Cargando fotos...</div> : null}
          </div>

          {!loadingFotos && !fotos.length ? (
            <div className="mt-3 text-sm text-stone-500">No hay fotos guardadas en esta orden.</div>
          ) : null}

          {fotosBlock.length ? (
            <div className="mt-5">
              <div className="text-sm font-black text-stone-800">Block</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {fotosBlock.map((f, idx) => (
                  <a key={idx} href={f.url} target="_blank" rel="noreferrer">
                    <img
                      src={f.url}
                      alt={`Block ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {fotosCabezote.length ? (
            <div className="mt-6">
              <div className="text-sm font-black text-stone-800">Cabezote</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {fotosCabezote.map((f, idx) => (
                  <a key={idx} href={f.url} target="_blank" rel="noreferrer">
                    <img
                      src={f.url}
                      alt={`Cabezote ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
