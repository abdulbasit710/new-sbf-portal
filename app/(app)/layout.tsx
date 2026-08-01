"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";
import { useSession } from "@/lib/session";

const TITLES: Record<string, string> = {
  dashboard: "Command Dashboard",
  deals: "Active Matches",
  "sbf-vault": "Assets & SBF Vault",
  underwriting: "Underwritten Assets",
  "buy-box": "Buy Box / Mandate",
  "matching-engine": "Matching Engine",
  documents: "Documents & Diligence",
  submissions: "My Submissions",
  intake: "Universal Intake",
  support: "Support Requests",
  rules: "Review Rhythm & Rules",
  command: "Raw SBF WORLD Portal",
  payouts: "Review Rhythm & Rules",
  admin: "Admin OS — Control Center",
  settings: "Partner Identity",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { session } = useSession();
  const role = session?.role ?? "investor";

  const seg = pathname.split("/")[1] || "dashboard";
  const title = seg === "dashboard" && role === "investor" ? "Investor Command Center" : TITLES[seg] ?? "SBF World OS";

  return (
    <div className="sbf-orb-bg sbf-page-shell min-h-screen bg-ink-950">
      <Sidebar role={role} />
      <div className="lg:pl-72">
        <Topbar title={title} />
        <main className="relative z-10 mx-auto max-w-[1920px] px-4 pb-24 pt-6 sm:px-6 lg:py-8 xl:px-12 2xl:px-16">
          {children}
        </main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
