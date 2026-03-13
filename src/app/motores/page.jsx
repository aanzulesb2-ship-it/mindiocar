"use client";

import { useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useMotoresCatalog } from "@/hooks/useMotoresCatalog";
import { normalizeMotorName } from "@/lib/motoresCatalog";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

export default function MotoresPage() {
  const { motores, addMotor, renameMotor, deleteMotor, loadingMotores } = useMotoresCatalog();
  const [search, setSearch] = useState("");
  const [newMotor, setNewMotor] = useState("");
  const [editingMotor, setEditingMotor] = useState("");
  const [editingValue, setEditingValue] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeMotorName(search).toLowerCase();
    if (!q) return motores;
    return motores.filter((motor) => motor.toLowerCase().includes(q));
  }, [motores, search]);

  const handleAdd = () => {
    const value = normalizeMotorName(newMotor);
    if (!value) return;
    addMotor(value);
    setNewMotor("");
  };

  const handleRename = (oldName) => {
    const value = normalizeMotorName(editingValue);
    if (!value) return;
    renameMotor(oldName, value);
    setEditingMotor("");
    setEditingValue("");
  };

  return (
    <ProtectedRoute requiredRole={["admin", "tecnico"]}>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
          <h1 className="text-2xl font-black tracking-tight">Motores</h1>
          <p className="text-sm text-stone-500 mt-1">
            Catalogo rapido de motores. Lo que agregues aqui tambien aparece en el campo Motor de las ordenes.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2"
                placeholder="Buscar motor rapido..."
              />
            </div>

            <div className="flex gap-2">
              <input
                value={newMotor}
                onChange={(e) => setNewMotor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="rounded-xl border border-stone-300 px-3 py-2"
                placeholder="Agregar motor"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-4 py-2 font-semibold"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 overflow-hidden">
            {loadingMotores ? (
              <div className="p-4 text-sm text-stone-500">Cargando motores...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-stone-500">No hay motores registrados.</div>
            ) : (
              filtered.map((motor) => {
                const isEditing = editingMotor === motor;
                return (
                  <div key={motor} className="flex items-center gap-3 justify-between px-4 py-3 border-b last:border-b-0">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRename(motor);
                            }
                          }}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2"
                        />
                      ) : (
                        <div className="font-semibold text-stone-800">{motor}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRename(motor)}
                            className="rounded-lg bg-stone-900 text-white px-3 py-2 text-sm font-semibold"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMotor("");
                              setEditingValue("");
                            }}
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMotor(motor);
                              setEditingValue(motor);
                            }}
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold inline-flex items-center gap-2"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMotor(motor)}
                            className="rounded-lg bg-white text-brand-red border border-red-200 px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
