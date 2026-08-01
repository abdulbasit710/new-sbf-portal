"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <span className="label-mono text-gold">{eyebrow}</span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">
          {title}
        </h1>
        {desc && <p className="mt-1.5 max-w-xl text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-medium tracking-tight text-chalk">
        {children}
      </h2>
      {right}
    </div>
  );
}
