"use client";

import DynamicPortalDashboard from "@/components/notion/DynamicPortalDashboard";
import InvestorDashboard from "@/components/dashboards/InvestorDashboard";
import { useSession } from "@/lib/session";

export default function DashboardPage() {
  const { session } = useSession();
  return session?.role === "investor"
    ? <InvestorDashboard />
    : <DynamicPortalDashboard view="overview" />;
}
