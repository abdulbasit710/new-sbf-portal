"use client";

import { motion } from "framer-motion";

export default function RiskGauge({
  value,
  size = 180,
}: {
  value: number;
  size?: number;
}) {
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  const pct = value / 100;
  const tier = value < 35 ? "Low" : value < 60 ? "Moderate" : "Elevated";
  const color = value < 35 ? "#34D399" : value < 60 ? "#C8A24A" : "#F87171";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - pct * c }}
          viewport={{ once: true }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-semibold text-chalk">
          {value}
        </span>
        <span
          className="label-mono mt-1"
          style={{ color }}
        >
          {tier} Risk
        </span>
      </div>
    </div>
  );
}
