"use client";

import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function colorForLabel(label = "") {
  const k = String(label).toLowerCase().trim();

  // Estados
  if (["finalizado","finalizada","entregado","entregada","completado","completada"].includes(k)) return "#16a34a";
  if (["pendiente","en proceso","proceso","diagnostico","diagnóstico"].includes(k)) return "#f59e0b";
  if (["pausado","suspendido","detenido"].includes(k)) return "#64748b";
  if (["anulado","cancelado"].includes(k)) return "#e0b400";

  // Prioridades
  if (k === "urgente") return "#ffcd11";
  if (k === "alta") return "#f97316";
  if (k === "media") return "#eab308";
  if (k === "baja") return "#94a3b8";

  // fallback estable
  const palette = ["#ffcd11","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7","#64748b"];
  let sum = 0;
  for (let i = 0; i < k.length; i++) sum += k.charCodeAt(i);
  return palette[sum % palette.length];
}

export default function DonutChart({ title, labels = [], values = [] }) {
  const backgroundColor = useMemo(() => labels.map(colorForLabel), [labels]);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor,
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "80%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 14,
          usePointStyle: true,
          boxWidth: 10,
          font: { size: 11, weight: "bold" },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 14, weight: "900" },
        color: "#0f172a",
        padding: { top: 6, bottom: 8 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const lab = ctx.label || "";
            const v = Number(ctx.raw || 0);
            const total = (ctx.dataset.data || []).reduce((a, b) => a + Number(b || 0), 0);
            const pct = total ? Math.round((v / total) * 100) : 0;
            return `${lab}: ${v} (${pct}%)`;
          },
        },
      },
    },
  };

  const chartSize = 192;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
      <div style={{ width: chartSize, height: chartSize, margin: "0 auto" }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
