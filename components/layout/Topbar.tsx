"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";
import { ROLE_META } from "@/lib/data";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import SbfWorldBrand from "@/components/ui/SbfWorldBrand";

type PortalNotification = {
  id: string;
  title: string;
  status: string;
  message: string;
  sourceTitle: string;
  updated: string;
  actionType: string;
};

const shortTime = (value: string) => {
  if (!value) return "live";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "live";
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

export default function Topbar({ title }: { title: string }) {
  const { session, logout } = useSession();
  const router = useRouter();
  const [openN, setOpenN] = useState(false);
  const [openU, setOpenU] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  const role = session?.role ?? "investor";

  useEffect(() => {
    if (!session?.email) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        if (session.role === "admin") {
          const response = await fetch(`/api/admin/crm?email=${encodeURIComponent(session.email)}&ts=${Date.now()}`, { cache: "no-store" });
          const payload = await response.json();
          if (!cancelled && response.ok && payload.success) {
            const rows = Array.isArray(payload.data?.rows) ? payload.data.rows : [];
            const adminItems = rows
              .filter((row: any) => {
                const haystack = [row.title, row.status, row.route, row.entityType, row.sourceTitle, ...(row.fields ? Object.values(row.fields) : [])].join(" ").toLowerCase();
                return ["full reveal", "lock request", "project lock", "pending", "new", "submitted", "matching request", "add to my matches", "needs docs", "in review", "admin review"].some((token) => haystack.includes(token));
              })
              .sort((a: any, b: any) => {
                const priority = (row: any) => /add to my matches|matching request|submitted for review/i.test([row.title, row.status, row.route, ...(row.fields ? Object.values(row.fields) : [])].join(" ")) ? 1 : 0;
                const priorityDifference = priority(b) - priority(a);
                if (priorityDifference) return priorityDifference;
                return String(b.updated || b.fields?.["Last Updated"] || b.fields?.["Submitted At"] || "").localeCompare(String(a.updated || a.fields?.["Last Updated"] || a.fields?.["Submitted At"] || ""));
              })
              .slice(0, 12)
              .map((row: any) => ({
                id: row.id,
                title: row.title || "SBF WORLD approval request",
                status: row.status || "Pending",
                message: `${row.owner || row.email || "A portal user"} needs admin review for ${row.route || row.entityType || "a CRM record"}.`,
                sourceTitle: row.sourceTitle || "Admin CRM",
                updated: row.updated || row.fields?.["Last Updated"] || row.fields?.["Submitted At"] || "",
                actionType: row.route || row.entityType || "Admin review",
              }));
            setNotifications(adminItems);
          }
          return;
        }

        const response = await fetch(`/api/notion/portal/notifications?email=${encodeURIComponent(session.email)}&ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) {
          setNotifications(Array.isArray(payload.data?.items) ? payload.data.items : []);
        }
      } catch {
        if (!cancelled) setNotifications([]);
      }
    };

    void load();
    const timer = window.setInterval(load, session.role === "admin" ? 30000 : 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session?.email, session?.role]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#050505]/78 px-6 shadow-[0_18px_60px_-48px_rgba(212,175,55,0.5)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <SbfWorldBrand compact className="lg:hidden" />
        <div className="hidden h-10 w-px bg-white/[0.07] lg:block" />
        <img
          src="/sbf-world-logo-transparent.png"
          alt="SBF WORLD"
          className="hidden h-12 w-12 object-contain [filter:drop-shadow(0_0_5px_rgba(244,201,91,0.5))_drop-shadow(0_0_16px_rgba(212,175,55,0.24))] lg:block"
        />
        <h1 className="text-lg font-medium tracking-tight text-chalk">
          {title}
        </h1>
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Systems Operational
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-sm text-muted shadow-inner md:flex">
          {Icon.search(15)}
          <input
            placeholder="Search deals, users…"
            className="w-40 bg-transparent text-chalk outline-none placeholder:text-muted/50"
          />
          <kbd className="rounded border border-white/10 px-1.5 text-[10px]">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenN((v) => !v);
              setOpenU(false);
            }}
            className="relative rounded-lg p-2.5 text-chalk/70 transition-colors hover:bg-white/5 hover:text-chalk"
          >
            {Icon.bell(19)}
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-black shadow-glow-sm">
                {Math.min(9, notifications.length)}
              </span>
            )}
          </button>
          <AnimatePresence>
            {openN && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="glass absolute right-0 mt-2 w-80 rounded-2xl p-2 shadow-glow"
              >
                <div className="px-3 py-2 label-mono text-muted">
                  {session?.role === "admin" ? "Admin Approval Alerts" : "SBF WORLD Notifications"}
                </div>
                {notifications.length === 0 ? (
                  <div className="rounded-xl px-3 py-4 text-sm text-muted">{session?.role === "admin" ? "No partner requests waiting right now." : "No approval or reveal updates yet."}</div>
                ) : notifications.slice(0, 8).map((n) => (
                  <Link
                    key={n.id}
                    href={session?.role === "admin" ? "/admin" : "/submissions"}
                    className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                    onClick={() => setOpenN(false)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="line-clamp-1 text-sm text-chalk">{n.title}</span>
                      <span className="text-[11px] text-muted">{shortTime(n.updated)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] text-gold">{n.status}</span>
                      <span className="truncate text-[10px] text-muted">{n.sourceTitle}</span>
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenU((v) => !v);
              setOpenN(false);
            }}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.025] py-1.5 pl-1.5 pr-3 transition-all hover:border-gold/35 hover:bg-gold/[0.04]"
          >
            <ProfileAvatar email={session?.email} name={session?.name} />
            <span className="hidden text-left leading-none sm:block">
              <span className="block text-sm text-chalk">
                {session?.name ?? "Guest"}
              </span>
              <span className="label-mono text-muted">
                {session?.relationshipType ?? ROLE_META[role].label}
              </span>
            </span>
          </button>
          <AnimatePresence>
            {openU && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="glass absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-glow"
              >
                <div className="border-b border-white/[0.06] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      email={session?.email}
                      name={session?.name}
                      className="h-11 w-11 rounded-xl"
                      textClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm text-chalk">
                        {session?.email ?? "guest@sbf.world"}
                      </div>
                      <div className="label-mono mt-1 truncate text-gold">
                        {session?.relationshipType ?? ROLE_META[role].tag}
                      </div>
                    </div>
                  </div>
                </div>
                <Link href="/settings">
                  <div className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-chalk/80 transition-colors hover:bg-white/[0.04]">
                    {Icon.settings(16)} Settings
                  </div>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                >
                  {Icon.logout(16)} Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
