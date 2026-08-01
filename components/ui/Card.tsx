"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  hover = false,
  glow = false,
  onClick,
}: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl ${hover ? "glass-hover cursor-pointer" : ""} ${glow ? "shadow-glow" : "shadow-panel"} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.05]">
      <div>
        <h3 className="text-chalk font-medium tracking-tight">{title}</h3>
        {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
