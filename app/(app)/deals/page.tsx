"use client";

import DynamicPortalDashboard from "@/components/notion/DynamicPortalDashboard";
import BruceMatchesPage from "@/components/matching/BruceVisibleMatches";
import { useSession } from "@/lib/session";

export default function DealsPage() {
  const { session } = useSession();
  return session?.role === "investor" ? <BruceMatchesPage /> : <DynamicPortalDashboard view="matches" />;
}
