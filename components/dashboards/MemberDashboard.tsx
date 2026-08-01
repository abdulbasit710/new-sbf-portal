"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KpiWidget from "@/components/ui/KpiWidget";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import DealForm from "@/components/deals/DealForm";
import CPFlow from "@/components/deals/CPFlow";
import MatchingEngine from "@/components/matching/MatchingEngine";
import BlueprintPortalPanel from "@/components/notion/BlueprintPortalPanel";
import Table, { type Column } from "@/components/ui/Table";
import StatusBadge, { RiskBadge, PillarTag } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icons";
import { DEALS, fmtMoney } from "@/lib/data";
import type { Deal } from "@/lib/types";

// Member sees a subset (their own originated deals)
const OWN = DEALS.slice(0, 5);

export default function MemberDashboard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const cols: Column<Deal>[] = [
    {
      key: "id",
      header: "Deal ID",
      render: (d) => <span className="font-mono text-xs text-gold">{d.id}</span>,
    },
    {
      key: "title",
      header: "Title",
      render: (d) => <span className="text-chalk/90">{d.title}</span>,
    },
    {
      key: "pillar",
      header: "Pillar",
      render: (d) => <PillarTag pillar={d.pillar} />,
    },
    {
      key: "stage",
      header: "Status",
      render: (d) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gold">{d.stage}</span>
          <StatusBadge status={d.status} />
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      render: (d) => <RiskBadge value={d.risk} />,
    },
    {
      key: "updated",
      header: "Last Updated",
      render: (d) => <span className="text-xs text-muted">{d.updated}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Member Portal"
        title="My Deals"
        desc="Submit new deals and track them through the CP1 → CP7 pipeline."
        action={
          <Button icon={Icon.plus(18)} onClick={() => setOpen(true)}>
            Submit New Deal
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiWidget label="Submitted Deals" value="5" delta="1 this month" up icon={Icon.deals(18)} />
        <KpiWidget label="In Pipeline" value="4" icon={Icon.layers(18)} />
        <KpiWidget label="Total Origination" value={fmtMoney(472_700_000)} delta="12%" up icon={Icon.bank(18)} />
      </div>

      <MatchingEngine role="member" />
      <BlueprintPortalPanel role="member" />

      <Card className="mt-6">
        <CardHeader
          title="Lead Deal Progress"
          sub="SBF-0481 — Meridian Tower"
        />
        <div className="px-6 py-8">
          <CPFlow current="CP5" />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Deal Tracking"
          sub="Your originated deals"
          action={<span className="label-mono text-muted">{OWN.length} deals</span>}
        />
        <Table columns={cols} rows={OWN} onRowClick={(d) => router.push(`/deals/${d.id}`)} />
      </Card>

      <DealForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => {
          setOpen(false);
          setToast(true);
          setTimeout(() => setToast(false), 3200);
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] rounded-xl border border-gold/30 bg-ink-900 px-5 py-4 shadow-glow">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
              ✓
            </span>
            <div>
              <div className="text-sm text-chalk">Deal submitted</div>
              <div className="text-xs text-muted">Entered pipeline at CP1 — Origination</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
