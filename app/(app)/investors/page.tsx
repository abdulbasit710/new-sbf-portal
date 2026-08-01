"use client";

import DynamicPortalDashboard from "@/components/notion/DynamicPortalDashboard";
import InvestorManager from "@/components/investors/InvestorManager";

export default function InvestorsPage() {
  return (
    <div className="space-y-8">
      <InvestorManager />
      <DynamicPortalDashboard view="investors" />
    </div>
  );
}
