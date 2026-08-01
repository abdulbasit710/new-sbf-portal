"use client";

import DynamicPortalDashboard from "@/components/notion/DynamicPortalDashboard";
import BruceMatchingEngine from "@/components/matching/BruceMatchingEngine";
import { useSession } from "@/lib/session";

export default function MatchingEnginePage() {
  const { session } = useSession();
  return session?.role === "investor" ? <BruceMatchingEngine /> : <DynamicPortalDashboard view="matching-engine" />;
}
