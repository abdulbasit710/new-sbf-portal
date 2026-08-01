"use client";

import { motion } from "framer-motion";

/* ---------------- Bar Chart ---------------- */
export function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-t-md bg-gradient-to-t from-gold-deep/40 to-gold relative group"
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-gold opacity-0 transition-opacity group-hover:opacity-100">
                {d.value}
              </span>
            </motion.div>
          </div>
          <span className="label-mono text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Line Chart ---------------- */
export function LineChart({
  data,
  height = 180,
}: {
  data: number[];
  height?: number;
}) {
  const w = 520;
  const h = height;
  const pad = 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8A24A" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C8A24A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={w - pad}
          y1={h * g}
          y2={h * g}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      <motion.polygon
        points={area}
        fill="url(#lineFill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />
      <motion.polyline
        points={line}
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#0A0A0A" stroke="#D4AF37" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ---------------- Donut Chart ---------------- */
export function DonutChart({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="-rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const seg = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
        <circle cx={size / 2} cy={size / 2} r={r - 14} fill="#0A0A0A" />
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="text-chalk/80">{d.label}</span>
            <span className="ml-auto font-mono text-xs text-muted">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
