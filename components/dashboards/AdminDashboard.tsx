"use client";

import { useState } from "react";
import Link from "next/link";
import KpiWidget from "@/components/ui/KpiWidget";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table, { type Column } from "@/components/ui/Table";
import StatusBadge, { RiskBadge, PillarTag } from "@/components/ui/StatusBadge";
import { LineChart } from "@/components/charts/Charts";
import MatchingEngine from "@/components/matching/MatchingEngine";
import BlueprintPortalPanel from "@/components/notion/BlueprintPortalPanel";
import { PageHeader } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icons";
import {
  DEALS,
  AUDIT_LOG,
  CAPITAL_TREND,
  fmtMoney,
} from "@/lib/data";
import type { Deal, DealStatus } from "@/lib/types";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const [statuses, setStatuses] = useState<Record<string, DealStatus>>(
    Object.fromEntries(DEALS.map((d) => [d.id, d.status])),
  );

  const setStatus = (id: string, s: DealStatus) =>
    setStatuses((m) => ({ ...m, [id]: s }));

  const totalAUM = DEALS.reduce((s, d) => s + d.value, 0);
  const inReview = DEALS.filter((d) => statuses[d.id] === "review").length;

  const cols: Column<Deal>[] = [
    { key: "id", header: "Deal ID", render: (d) => <Link href={`/deals/${d.id}`} className="font-mono text-xs text-gold hover:underline">{d.id}</Link> },
    { key: "title", header: "Title", render: (d) => <span className="text-chalk/90">{d.title}</span> },
    { key: "pillar", header: "Pillar", render: (d) => <PillarTag pillar={d.pillar} /> },
    { key: "stage", header: "CP", render: (d) => <span className="font-mono text-xs text-gold">{d.stage}</span> },
    { key: "risk", header: "Risk", render: (d) => <RiskBadge value={d.risk} /> },
    { key: "value", header: "Size", render: (d) => <span className="font-mono text-xs text-chalk/80">{fmtMoney(d.value)}</span> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={statuses[d.id]} /> },
    {
      key: "actions",
      header: "Decision",
      render: (d) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => setStatus(d.id, "approved")}
            className="rounded-md border border-emerald-400/30 px-2 py-1 text-[11px] text-emerald-300 transition-colors hover:bg-emerald-400/10"
          >
            Approve
          </button>
          <button
            onClick={() => setStatus(d.id, "rejected")}
            className="rounded-md border border-red-500/30 px-2 py-1 text-[11px] text-red-300 transition-colors hover:bg-red-500/10"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Full System Access"
        title="Control Center"
        desc="Complete visibility across all deals, capital, and pipeline governance."
        action={
          <Link href="/admin">
            <Button variant="outline" icon={Icon.layers(18)}>
              Open Admin OS
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiWidget label="Total AUM" value={fmtMoney(totalAUM)} delta="6.8%" up icon={Icon.bank(18)} spark={CAPITAL_TREND} />
        <KpiWidget label="Deals in System" value={String(DEALS.length)} delta="2 new" up icon={Icon.deals(18)} />
        <KpiWidget label="Pending Review" value={String(inReview)} icon={Icon.shield(18)} />
        <KpiWidget label="Avg. Risk Score" value="42 / 100" delta="3 pts" up={false} icon={Icon.pulse(18)} />
      </div>

      <MatchingEngine role="admin" />
      <BlueprintPortalPanel role="admin" />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="System AUM Trend" sub="Trailing 12 months — USD millions" />
          <div className="p-6 pt-4">
            <LineChart data={CAPITAL_TREND} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Audit Log" sub="Live system events" action={<Link href="/admin" className="label-mono text-gold hover:underline">View all</Link>} />
          <div className="max-h-[260px] divide-y divide-white/[0.04] overflow-y-auto">
            {AUDIT_LOG.slice(0, 5).map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="px-5 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      a.level === "critical"
                        ? "bg-red-400"
                        : a.level === "warning"
                          ? "bg-gold"
                          : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-xs text-chalk/90">{a.action}</span>
                </div>
                <div className="mt-1 pl-3.5 text-[11px] text-muted">
                  {a.actor} · {a.target} · {a.time}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="All Deals — System Visibility"
          sub="Approve, reject, and govern every deal"
          action={<span className="label-mono text-muted">{DEALS.length} total</span>}
        />
        <Table columns={cols} rows={DEALS} />
      </Card>
    </div>
  );
}
