"use client";

import { useMemo, useState } from "react";
import { normalizeMotorName } from "@/lib/motoresCatalog";

export default function MotorAutocompleteInput({
  label = "Motor",
  value,
  onChange,
  motores,
  placeholder = "Busca o escribe un motor",
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = normalizeMotorName(value).toLowerCase();
    const list = Array.isArray(motores) ? motores : [];
    if (!q) return list.slice(0, 8);
    return list.filter((motor) => motor.toLowerCase().includes(q)).slice(0, 8);
  }, [motores, value]);

  return (
    <div className="relative">
      <label className="text-xs font-black uppercase tracking-widest text-stone-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        className="mt-2 w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
        placeholder={placeholder}
        autoComplete="off"
      />

      {focused && suggestions.length ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
          {suggestions.map((motor) => (
            <button
              key={motor}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(motor);
                setFocused(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              {motor}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
