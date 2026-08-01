"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Deal } from "@/lib/types";
import { fmtMoney, PILLAR_CODE } from "@/lib/data";
import { RiskBadge } from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

export default function DealCard({ deal, i = 0 }: { deal: Deal; i?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: i * 0.05 }}
      className="glass glass-hover group flex flex-col rounded-2xl p-5"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/25 bg-gold/10 font-mono text-[11px] text-gold">
          {PILLAR_CODE[deal.pillar]}
        </span>
        <RiskBadge value={deal.risk} />
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-medium leading-snug text-chalk">
        {deal.title}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {deal.location} · {deal.sponsor}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
        <Metric label="Size" value={fmtMoney(deal.value)} />
        <Metric label="Target ROI" value={`${deal.roi}%`} accent />
        <Metric label="Stage" value={deal.stage} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="label-mono text-muted">
          Match {deal.matchScore}%
        </span>
        <Link href={`/deals/${deal.id}`}>
          <Button variant="outline" size="sm">
            View Deal
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="label-mono text-muted">{label}</div>
      <div
        className={`mt-1 font-mono text-sm ${accent ? "text-gold" : "text-chalk"}`}
      >
        {value}
      </div>
    </div>
  );
}
