"use client";

import Link from "next/link";
import { Wrench, Users, FileText, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { useOrdenes } from "@/components/OrdenesContext";
import DonutChart from "@/components/charts/DonutChart";

function Kpi({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
      <div className="text-sm text-stone-500">{title}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
      {subtitle ? <div className="text-xs text-stone-500 mt-2">{subtitle}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { ordenes, loading, error } = useOrdenes();

  const stats = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();

    const isThisMonth = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt.getMonth() === m && dt.getFullYear() === y;
    };

    const byEstado = {};
    const byPrioridad = {};
    let finalizadosMes = 0;
    let activos = 0;
    let urgentes = 0;

    for (const o of ordenes || []) {
      const estado = (o.estado || "pendiente").toLowerCase();
      const prioridad = (o.prioridad || 'media').toLowerCase();

      byEstado[estado] = (byEstado[estado] || 0) + 1;
      byPrioridad[prioridad] = (byPrioridad[prioridad] || 0) + 1;

      const isFinal = estado === "finalizado" || estado === "entregado";
      if (isThisMonth(o.created_at) && isFinal) finalizadosMes += 1;

      if (!isFinal) activos += 1;

      if (estado === 'pendiente' && (prioridad === 'alta' || prioridad === 'urgente')) urgentes += 1;
    }

    return { byEstado, byPrioridad, finalizadosMes, activos, urgentes };
  }, [ordenes]);

  const estadoLabels = Object.keys(stats.byEstado);
  const estadoValues = estadoLabels.map((k) => stats.byEstado[k]);

  const prioLabels = Object.keys(stats.byPrioridad);
  const prioValues = prioLabels.map((k) => stats.byPrioridad[k]);

  if (loading) return <div className="p-6">Cargando dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          Panel de Control <span className="text-red-600">Rojo Potencia</span>
        </h1>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/gestor"
            className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition"
          >
            Ir a Órdenes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Motores activos en taller" value={stats.activos} />
        <Kpi title="Finalizados (mes)" value={stats.finalizadosMes} />
        <Kpi title="Pendientes urgentes" value={stats.urgentes} subtitle="Pendiente + Prioridad alta" />
        <Kpi title="Total en sistema" value={(ordenes || []).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart title="Órdenes por estado" labels={estadoLabels} values={estadoValues} />
        <DonutChart title="Órdenes por prioridad" labels={prioLabels} values={prioValues} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link href="/gestor" className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4 hover:shadow-2xl transition flex items-center gap-3">
          <Wrench /> <div><div className="font-bold">Órdenes</div><div className="text-xs text-stone-500">Trabajos activos</div></div>
        </Link>
        <Link href="/clientes" className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4 hover:shadow-2xl transition flex items-center gap-3">
          <Users /> <div><div className="font-bold">Clientes</div><div className="text-xs text-stone-500">Directorio</div></div>
        </Link>
        <Link href="/facturacion" className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4 hover:shadow-2xl transition flex items-center gap-3">
          <FileText /> <div><div className="font-bold">Facturación</div><div className="text-xs text-stone-500">Proformas</div></div>
        </Link>
      </div>
    </div>
  );
}



