"use client";

import KpiWidget from "@/components/ui/KpiWidget";
import Card, { CardHeader } from "@/components/ui/Card";
import MatchingEngine from "@/components/matching/MatchingEngine";
import BlueprintPortalPanel from "@/components/notion/BlueprintPortalPanel";
import Table, { type Column } from "@/components/ui/Table";
import StatusBadge, { PillarTag } from "@/components/ui/StatusBadge";
import { BarChart } from "@/components/charts/Charts";
import { PageHeader, SectionTitle } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icons";
import { DEALS, fmtMoney } from "@/lib/data";
import type { Deal } from "@/lib/types";
import { motion } from "framer-motion";

const REFERRED = DEALS.slice(2, 7);

const COMMISSION = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 51 },
  { label: "Mar", value: 38 },
  { label: "Apr", value: 67 },
  { label: "May", value: 74 },
  { label: "Jun", value: 88 },
];

const PERFORMANCE = [
  { label: "Real Estate", deals: 8, conv: 62, comm: 1_240_000 },
  { label: "Capital", deals: 5, conv: 71, comm: 980_000 },
  { label: "Business", deals: 4, conv: 48, comm: 540_000 },
];

export default function PartnerDashboard() {
  const cols: Column<Deal>[] = [
    { key: "id", header: "Deal ID", render: (d) => <span className="font-mono text-xs text-gold">{d.id}</span> },
    { key: "title", header: "Referred Deal", render: (d) => <span className="text-chalk/90">{d.title}</span> },
    { key: "pillar", header: "Pillar", render: (d) => <PillarTag pillar={d.pillar} /> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    {
      key: "comm",
      header: "Est. Commission",
      render: (d) => <span className="font-mono text-sm text-gold">{fmtMoney(d.value * 0.012)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Partner Portal"
        title="Referral Performance"
        desc="Submitted deals, conversion analytics, and commission tracking across your network."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiWidget label="Deals Referred" value="17" delta="3 this month" up icon={Icon.deals(18)} />
        <KpiWidget label="Conversion Rate" value="61%" delta="4%" up icon={Icon.trend(18)} />
        <KpiWidget label="Commission YTD" value={fmtMoney(2_760_000)} delta="11%" up icon={Icon.bank(18)} spark={COMMISSION.map((c) => c.value)} />
        <KpiWidget label="Active Referrals" value="9" icon={Icon.users(18)} />
      </div>

      <MatchingEngine role="partner" />
      <BlueprintPortalPanel role="partner" />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Commission Earned" sub="Monthly — USD thousands" />
          <div className="p-6 pt-8">
            <BarChart data={COMMISSION} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Conversion by Pillar" />
          <div className="space-y-4 p-6">
            {PERFORMANCE.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-chalk/80">{p.label}</span>
                  <span className="font-mono text-gold">{p.conv}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gold-grad"
                    initial={{ width: 0 }}
                    animate={{ width: `${p.conv}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {p.deals} deals · {fmtMoney(p.comm)} earned
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader title="Referral Tracking" sub="Your submitted deals" />
        <Table columns={cols} rows={REFERRED} />
      </Card>
    </div>
  );
}
