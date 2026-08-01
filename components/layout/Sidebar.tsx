"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icons";
import SbfWorldBrand from "@/components/ui/SbfWorldBrand";
import { ROLE_META } from "@/lib/data";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  desc?: string;
  icon: (s?: number) => React.ReactNode;
  roles?: Role[];
}

const DEFAULT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.grid },
  { href: "/deals", label: "Deals", icon: Icon.deals },
  { href: "/sbf-vault", label: "SBF Vault", icon: Icon.market },
  {
    href: "/underwriting",
    label: "Underwriting",
    icon: Icon.shield,
    roles: ["member", "investor", "partner", "lender"],
  },
  { href: "/payouts", label: "Payouts", icon: Icon.payouts },
  {
    href: "/admin",
    label: "Admin OS",
    icon: Icon.layers,
    roles: ["admin"],
  },
  { href: "/settings", label: "Settings", icon: Icon.settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin Control Center", desc: "All CRM records", icon: Icon.layers },
  { href: "/dashboard", label: "System Dashboard", desc: "Admin overview", icon: Icon.grid },
  { href: "/matching-engine", label: "Matching Engine", desc: "Full admin matching view", icon: Icon.pulse },
  { href: "/submissions", label: "Partner Submissions", desc: "All submitted requests", icon: Icon.plus },
  { href: "/sbf-vault", label: "Assets & Vault", desc: "All assets and files", icon: Icon.market },
  { href: "/investors", label: "Investors / Buyers", desc: "Capital relationships", icon: Icon.users },
  { href: "/buy-box", label: "Buy Boxes", desc: "All mandates", icon: Icon.trend },
  { href: "/documents", label: "Documents", desc: "Diligence hub", icon: Icon.doc },
  { href: "/settings", label: "Admin Settings", desc: "Profile image & access", icon: Icon.settings },
];

const PARTNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Command Dashboard", desc: "Partner home", icon: Icon.grid },
  { href: "/settings", label: "Partner Identity", desc: "Profile & access", icon: Icon.users },
  { href: "/deals", label: "Active Matches", desc: "Brad-scoped deal flow", icon: Icon.deals },
  { href: "/sbf-vault", label: "Assets & SBF Vault", desc: "Assets and signals", icon: Icon.market },
  { href: "/investors", label: "My Investors", desc: "Buyers & lenders", icon: Icon.users },
  { href: "/underwriting", label: "My Underwriting", desc: "Approved outputs", icon: Icon.shield },
  { href: "/buy-box", label: "Buy Box / Mandate", desc: "Submit criteria", icon: Icon.trend },
  { href: "/matching-engine", label: "Matching Engine", desc: "Filter assets, teaser cards", icon: Icon.pulse },
  { href: "/documents", label: "Documents", desc: "Diligence center", icon: Icon.layers },
  { href: "/submissions", label: "My Submissions", desc: "Status & routing", icon: Icon.plus },
  { href: "/intake", label: "Universal Intake", desc: "Route into CORE", icon: Icon.plus },
  { href: "/support", label: "Support Requests", desc: "Team routing", icon: Icon.settings },
  { href: "/rules", label: "Review & Rules", desc: "Cadence and visibility", icon: Icon.shield },
  { href: "/command", label: "Raw SBF WORLD Portal", desc: "Full page mirror", icon: Icon.layers },
];

const INVESTOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Investor Dashboard", desc: "Qualification & next steps", icon: Icon.grid },
  { href: "/deals", label: "My Matches", desc: "Curated opportunities", icon: Icon.deals },
  { href: "/underwriting", label: "Underwriting Room", desc: "Analysis & risk review", icon: Icon.shield },
  { href: "/buy-box", label: "My Buy Box", desc: "Criteria & mandate", icon: Icon.trend },
  { href: "/documents", label: "Document Room", desc: "NDA, POF & diligence", icon: Icon.doc },
  { href: "/submissions", label: "My Requests", desc: "Information & lock requests", icon: Icon.plus },
  { href: "/matching-engine", label: "Matching Engine", desc: "Score Blueprint opportunities", icon: Icon.pulse },
  { href: "/settings", label: "Investor Profile", desc: "Identity & authority", icon: Icon.users },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const nav = role === "admin" ? ADMIN_NAV : role === "partner" ? PARTNER_NAV : role === "investor" ? INVESTOR_NAV : DEFAULT_NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-white/[0.07] bg-[#050505]/92 shadow-[18px_0_60px_-42px_rgba(212,175,55,0.55)] backdrop-blur-2xl lg:flex">
      <Link
        href="/dashboard"
        className="relative border-b border-white/[0.06] px-5 py-4 before:absolute before:bottom-0 before:left-6 before:h-px before:w-28 before:bg-gradient-to-r before:from-gold before:to-transparent"
      >
        <SbfWorldBrand />
      </Link>

      <nav className="sbf-scroll flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <div className="label-mono px-3 pb-2 text-muted/60">{role === "admin" ? "Admin CRM Navigation" : role === "investor" ? "Investor Navigation" : "Partner Navigation"}</div>
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`group relative flex items-start gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
                  active
                    ? "border border-gold/45 bg-gradient-to-r from-gold/16 to-gold/[0.045] text-gold shadow-glow-sm"
                    : "border border-transparent text-chalk/72 hover:border-gold/18 hover:bg-white/[0.045] hover:text-chalk"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r bg-gold shadow-glow-sm"
                  />
                )}
                <span className={`mt-0.5 ${active ? "text-gold" : "text-muted"}`}>
                  {item.icon(18)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.desc && <span className="mt-0.5 block truncate text-[11px] text-muted">{item.desc}</span>}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="rounded-xl border border-gold/15 bg-gold/[0.04] p-3.5">
          <div className="label-mono text-gold">{ROLE_META[role].tag}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {role === "admin"
              ? "Full CRM access for Crystal and Aly. Partner records remain scoped outside admin mode."
              : role === "partner"
                ? "Partner-scoped records only. SBF WORLD updates become website updates after refresh."
                : ROLE_META[role].desc}
          </p>
        </div>
      </div>
    </aside>
  );
}
