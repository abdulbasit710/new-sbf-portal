"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  sub?: string;
  width?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  title,
  sub,
  width = "max-w-2xl",
}: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`glass relative z-10 w-full ${width} rounded-2xl shadow-glow max-h-[88vh] overflow-hidden flex flex-col`}
          >
            {title && (
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
                <div className="min-w-0">
                  <h2 className="text-lg font-medium tracking-tight text-chalk">
                    {title}
                  </h2>
                  {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-chalk"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6 6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="min-w-0 overflow-x-hidden overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
