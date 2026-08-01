"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CPFlow from "@/components/deals/CPFlow";
import RiskGauge from "@/components/deals/RiskGauge";
import StatusBadge, { PillarTag } from "@/components/ui/StatusBadge";
import { Icon } from "@/components/ui/Icons";
import { DEALS, CP_STAGES, stageIndex, fmtMoney } from "@/lib/data";

const DOC_COLOR: Record<string, string> = {
  verified: "text-emerald-300 border-emerald-400/20 bg-emerald-400/10",
  pending: "text-gold border-gold/25 bg-gold/10",
  flagged: "text-red-300 border-red-500/20 bg-red-500/10",
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const deal = DEALS.find((d) => d.id === id);

  if (!deal) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Deal not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/deals")}>
          Back to Deals
        </Button>
      </div>
    );
  }

  const idx = stageIndex(deal.stage);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-5 flex items-center gap-2 text-sm text-muted transition-colors hover:text-chalk"
      >
        <span className="rotate-180">{Icon.arrow(15)}</span> Back
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gold">{deal.id}</span>
            <PillarTag pillar={deal.pillar} />
            <StatusBadge status={deal.status} />
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-chalk">
            {deal.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {deal.location} · Sponsored by {deal.sponsor}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" icon={Icon.doc(16)}>
            Data Room
          </Button>
          <Button icon={Icon.arrow(16)}>Express Interest</Button>
        </div>
      </motion.div>

      {/* CP Flow tracker */}
      <Card className="mb-6">
        <CardHeader
          title="CP Pipeline Tracker"
          sub={`Currently at ${deal.stage} — ${CP_STAGES[idx].label}`}
        />
        <div className="px-6 py-8">
          <CPFlow current={deal.stage} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: overview + financials + docs */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Deal Overview" />
            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-chalk/80">{deal.summary}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Capital", fmtMoney(deal.value)],
                  ["Target ROI", `${deal.roi}%`],
                  ["LTV", deal.ltv > 0 ? `${deal.ltv}%` : "Equity"],
                  ["Match", `${deal.matchScore}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/[0.06] bg-ink-850/50 p-4">
                    <div className="label-mono text-muted">{k}</div>
                    <div className="mt-1.5 font-mono text-lg text-chalk">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Financial Summary" />
            <div className="divide-y divide-white/[0.04] px-6">
              {deal.financials.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-muted">{f.label}</span>
                  <span className="font-mono text-sm text-chalk">{f.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Documents"
              sub="Uploaded supporting materials"
              action={<span className="label-mono text-muted">{deal.documents.length} files</span>}
            />
            <div className="divide-y divide-white/[0.04] px-6">
              {deal.documents.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-ink-850 text-gold">
                      {Icon.doc(16)}
                    </span>
                    <div>
                      <div className="text-sm text-chalk/90">{doc.name}</div>
                      <div className="text-[11px] text-muted">
                        {doc.type} · {doc.size} · {doc.uploaded}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] capitalize ${DOC_COLOR[doc.status]}`}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: risk + timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Risk Score" sub="Quantitative underwriting" />
            <div className="flex flex-col items-center px-6 py-7">
              <RiskGauge value={deal.risk} />
              <div className="mt-6 w-full space-y-2.5">
                {[
                  ["Market", Math.round(deal.risk * 0.9)],
                  ["Leverage", deal.ltv > 0 ? deal.ltv : 20],
                  ["Sponsor", Math.round(deal.risk * 0.7)],
                  ["Liquidity", Math.round(deal.risk * 1.1)],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-muted">{k as string}</span>
                      <span className="font-mono text-chalk/70">{v as number}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-gold-grad"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(v as number, 100)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Status Timeline" sub="CP progression" />
            <div className="px-6 py-5">
              <div className="relative space-y-5 pl-6">
                <div className="absolute left-[7px] top-1 h-[calc(100%-1rem)] w-px bg-white/[0.08]" />
                {CP_STAGES.map((cp, i) => {
                  const done = i < idx;
                  const active = i === idx;
                  return (
                    <div key={cp.stage} className="relative">
                      <span
                        className={`absolute -left-[22px] top-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                          done
                            ? "border-gold bg-gold"
                            : active
                              ? "border-gold bg-ink-900 shadow-glow-sm"
                              : "border-white/20 bg-ink-900"
                        }`}
                      />
                      <div className={`text-sm ${i <= idx ? "text-chalk" : "text-muted"}`}>
                        {cp.stage} — {cp.label}
                      </div>
                      <div className="text-[11px] text-muted">
                        {done ? "Completed" : active ? "In progress" : "Pending"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
