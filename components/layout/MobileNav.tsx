"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icons";
import type { Role } from "@/lib/types";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.grid },
  { href: "/deals", label: "Matches", icon: Icon.deals },
  { href: "/matching-engine", label: "Engine", icon: Icon.pulse },
  { href: "/submissions", label: "Submits", icon: Icon.plus },
  { href: "/sbf-vault", label: "Vault", icon: Icon.market },
  {
    href: "/underwriting",
    label: "Risk",
    icon: Icon.shield,
    roles: ["member", "investor", "partner", "lender"] as Role[],
  },
  { href: "/admin", label: "Admin", icon: Icon.layers, roles: ["admin"] as Role[] },
  { href: "/settings", label: "Settings", icon: Icon.settings },
];

const INVESTOR_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Icon.grid },
  { href: "/deals", label: "Matches", icon: Icon.deals },
  { href: "/underwriting", label: "Analysis", icon: Icon.shield },
  { href: "/documents", label: "Documents", icon: Icon.doc },
  { href: "/settings", label: "Profile", icon: Icon.users },
];

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = role === "investor" ? INVESTOR_ITEMS : ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-950/90 px-2 pb-3 pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {visible.slice(0, 5).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition-colors ${
                  active ? "text-gold" : "text-muted hover:text-chalk"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-xl border border-gold/20 bg-gold/10"
                    transition={{ duration: 0.24 }}
                  />
                )}
                <span className="relative">{item.icon(17)}</span>
                <span className="relative max-w-full truncate px-1">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
