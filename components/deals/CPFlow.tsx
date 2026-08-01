"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CP_STAGES, stageIndex } from "@/lib/data";
import type { CPStage } from "@/lib/types";

interface CPFlowProps {
  current: CPStage;
  compact?: boolean;
}

export default function CPFlow({ current, compact = false }: CPFlowProps) {
  const activeIdx = stageIndex(current);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className={`flex w-full items-center ${compact ? "min-w-[520px]" : "min-w-[680px]"}`}>
      {CP_STAGES.map((cp, i) => {
        const state =
          i < activeIdx ? "done" : i === activeIdx ? "active" : "locked";
        const isLast = i === CP_STAGES.length - 1;
        return (
          <div key={cp.stage} className="flex flex-1 items-center">
            <div
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className={`relative flex items-center justify-center rounded-full border font-mono ${
                  compact ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-xs"
                } ${
                  state === "done"
                    ? "border-gold bg-gold/15 text-gold shadow-glow-sm"
                    : state === "active"
                      ? "border-gold bg-gold-grad text-ink-950 animate-pulse-gold"
                      : "border-white/10 bg-ink-800 text-muted"
                }`}
              >
                {state === "done" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6 9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : state === "locked" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  cp.stage.replace("CP", "")
                )}
              </motion.div>
              {!compact && (
                <span
                  className={`mt-2 text-[11px] tracking-wide ${
                    state === "locked" ? "text-muted" : "text-chalk/80"
                  }`}
                >
                  {cp.stage}
                </span>
              )}

              {hover === i && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-12 z-20 whitespace-nowrap rounded-lg border border-gold/30 bg-ink-900 px-3 py-1.5 text-xs shadow-glow-sm"
                >
                  <span className="text-gold">{cp.stage}</span>
                  <span className="mx-1.5 text-muted">·</span>
                  <span className="text-chalk/80">{cp.label}</span>
                </motion.div>
              )}
            </div>

            {!isLast && (
              <div className="relative mx-1 h-[2px] flex-1 overflow-hidden rounded bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: i < activeIdx ? "100%" : "0%" }}
                  transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-gold-grad"
                />
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
