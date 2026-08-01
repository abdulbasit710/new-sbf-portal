"use client";

import { useState } from "react";
import KpiWidget from "@/components/ui/KpiWidget";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import MatchingEngine from "@/components/matching/MatchingEngine";
import BlueprintPortalPanel from "@/components/notion/BlueprintPortalPanel";
import { BarChart } from "@/components/charts/Charts";
import { RiskBadge } from "@/components/ui/StatusBadge";
import { PageHeader, SectionTitle } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icons";
import { DEALS, fmtMoney, RETURN_BARS } from "@/lib/data";

// Lender sees debt-eligible deals (those with LTV > 0)
const DEBT = DEALS.filter((d) => d.ltv > 0);

export default function LenderDashboard() {
  const [committed, setCommitted] = useState<string | null>(null);
  const totalExposure = DEBT.reduce((s, d) => s + d.value * (d.ltv / 100), 0);
  const avgLtv = Math.round(DEBT.reduce((s, d) => s + d.ltv, 0) / DEBT.length);

  return (
    <div>
      <PageHeader
        eyebrow="Lender Portal"
        title="Debt Exposure"
        desc="Loan exposure, leverage profiles, and capital commitment across the secured book."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiWidget label="Total Loan Exposure" value={fmtMoney(totalExposure)} delta="4.2%" up icon={Icon.bank(18)} />
        <KpiWidget label="Weighted Avg. LTV" value={`${avgLtv}%`} delta="1.1%" up={false} icon={Icon.shield(18)} />
        <KpiWidget label="Active Facilities" value={String(DEBT.length)} icon={Icon.deals(18)} />
        <KpiWidget label="Blended Coupon" value="9.8%" delta="0.3%" up icon={Icon.trend(18)} />
      </div>

      <MatchingEngine role="lender" />
      <BlueprintPortalPanel role="lender" />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Coupon Yield" sub="By quarter — % gross" />
          <div className="p-6 pt-8">
            <BarChart data={RETURN_BARS} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Risk Distribution" sub="Facilities by tier" />
          <div className="space-y-3 p-6">
            {[
              ["Low (0–34)", DEBT.filter((d) => d.risk < 35).length, "#34D399"],
              ["Moderate (35–59)", DEBT.filter((d) => d.risk >= 35 && d.risk < 60).length, "#C8A24A"],
              ["Elevated (60+)", DEBT.filter((d) => d.risk >= 60).length, "#F87171"],
            ].map(([label, n, c]) => (
              <div key={label as string}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-chalk/80">{label as string}</span>
                  <span className="font-mono text-muted">{n as number}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((n as number) / DEBT.length) * 100}%`,
                      background: c as string,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <SectionTitle>Secured Facilities</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {DEBT.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-gold">{d.id}</span>
                  <h3 className="mt-1 font-medium text-chalk">{d.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{d.location}</p>
                </div>
                <RiskBadge value={d.risk} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-y border-white/[0.06] py-3 text-center">
                <div>
                  <div className="label-mono text-muted">Facility</div>
                  <div className="mt-1 font-mono text-sm text-chalk">{fmtMoney(d.value * (d.ltv / 100))}</div>
                </div>
                <div>
                  <div className="label-mono text-muted">LTV</div>
                  <div className={`mt-1 font-mono text-sm ${d.ltv > 70 ? "text-red-300" : "text-chalk"}`}>{d.ltv}%</div>
                </div>
                <div>
                  <div className="label-mono text-muted">DSCR</div>
                  <div className="mt-1 font-mono text-sm text-chalk">{d.financials[2].value}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">{d.sponsor}</span>
                <Button
                  variant={committed === d.id ? "ghost" : "primary"}
                  size="sm"
                  onClick={() => setCommitted(d.id)}
                >
                  {committed === d.id ? "✓ Committed" : "Commit Capital"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
