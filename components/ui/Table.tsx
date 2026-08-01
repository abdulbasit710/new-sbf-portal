"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: string;
}

export default function Table<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty = "No records found.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`label-mono px-5 py-3 text-left text-muted font-normal ${c.className || ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-muted"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-white/[0.04] transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-gold/[0.04]"
                    : ""
                }`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-4 ${c.className || ""}`}>
                    {c.render(row)}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
