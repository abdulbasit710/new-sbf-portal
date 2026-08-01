"use client";

import { motion } from "framer-motion";

export default function HeroBackground() {
  const lines = Array.from({ length: 7 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Faint grid */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Radial gold glow */}
      <div className="absolute left-1/2 top-1/3 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.07] blur-[120px]" />
      <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-gold/[0.04] blur-[100px]" />

      {/* Vertical data-flow lines */}
      <div className="absolute inset-0">
        {lines.map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/20 to-transparent"
            style={{ left: `${12 + i * 12}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="absolute left-0 h-24 w-px bg-gradient-to-b from-transparent via-gold to-transparent"
              animate={{ top: ["-10%", "110%"] }}
              transition={{
                duration: 5 + (i % 4),
                repeat: Infinity,
                delay: i * 0.7,
                ease: "linear",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}
