"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  className?: string;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gold-grad text-ink-950 font-semibold shadow-glow-sm hover:shadow-glow hover:brightness-110",
  outline:
    "border border-gold/40 text-gold hover:border-gold hover:bg-gold/10 hover:shadow-glow-sm",
  ghost: "text-chalk/80 hover:text-chalk hover:bg-white/5",
  danger:
    "border border-red-500/40 text-red-300 hover:bg-red-500/10 hover:border-red-500/70",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled,
  full,
  className = "",
  icon,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
