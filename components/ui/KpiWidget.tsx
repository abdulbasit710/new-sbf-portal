"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface KpiProps {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  icon?: ReactNode;
  spark?: number[];
}

export default function KpiWidget({
  label,
  value,
  delta,
  up = true,
  icon,
  spark,
}: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover rounded-2xl p-5 relative overflow-hidden group"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/5 blur-2xl group-hover:bg-gold/10 transition-colors" />
      <div className="flex items-center justify-between">
        <span className="label-mono text-muted">{label}</span>
        {icon && <span className="text-gold/70">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight text-chalk">
          {value}
        </span>
        {spark && <Sparkline data={spark} />}
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className={up ? "text-emerald-400" : "text-red-400"}>
            {up ? "▲" : "▼"} {delta}
          </span>
          <span className="text-muted">vs last quarter</span>
        </div>
      )}
    </motion.div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="#C8A24A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
