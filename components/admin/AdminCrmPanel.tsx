"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import KpiWidget from "@/components/ui/KpiWidget";
import { BarChart, DonutChart } from "@/components/charts/Charts";
import { PageHeader } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";
import { fetchAdminCrmSnapshot, updateAdminCrmStatus } from "@/lib/api/adminCrm";
import type { AdminBlueprintModule, AdminCrmRow, AdminCrmSnapshot, AdminCrmSource, NotionContentBlock } from "@/lib/notionService";

const ADMIN_EMAILS = ["crystal@sbfworld.com", "aly@sbfworld.com"];
const PAGE_SIZE = 20;
const MODULE_PAGE_SIZE = 12;

const ADMIN_SECTIONS = [
  { key: "overview", label: "Command Center", icon: Icon.grid, sub: "Whole CRM" },
  { key: "activity", label: "Activity Ledger", icon: Icon.pulse, sub: "By user" },
  { key: "blueprint", label: "God Blueprint OS", icon: Icon.layers, sub: "All pages" },
  { key: "people", label: "People & Access", icon: Icon.users, sub: "Logins" },
  { key: "submissions", label: "Submissions", icon: Icon.plus, sub: "Partner intake" },
  { key: "assets", label: "Assets", icon: Icon.market, sub: "All assets" },
  { key: "buy-boxes", label: "Buy Boxes", icon: Icon.trend, sub: "Mandates" },
  { key: "matching", label: "Matching Engine", icon: Icon.pulse, sub: "All matches" },
  { key: "documents", label: "Documents", icon: Icon.doc, sub: "Diligence" },
  { key: "support", label: "Support", icon: Icon.shield, sub: "Requests" },
  { key: "all", label: "All CRM Records", icon: Icon.globe, sub: "Everything" },
] as const;

type SectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

const ADMIN_ACTION_STATUSES = ["Approved", "Full Reveal Approved", "In Review", "Needs Docs", "Project Locked", "Rejected"] as const;

const text = (value?: string) => value?.trim() || "—";
const lc = (value?: string) => value?.toLowerCase() ?? "";
const parseAdminAmount = (value?: string) => {
  const cleaned = (value ?? "").replace(/,/g, "").trim().toLowerCase();
  const match = cleaned.match(/-?\$?\s*(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  if (cleaned.includes("bn") || cleaned.includes("billion") || cleaned.endsWith("b")) return base * 1_000_000_000;
  if (cleaned.includes("mm") || cleaned.includes("million") || cleaned.endsWith("m")) return base * 1_000_000;
  if (cleaned.includes("k")) return base * 1_000;
  return base;
};

const compactAdminMoney = (value: number) => {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${value.toLocaleString()}`;
};

function sourceMatches(section: SectionKey, source: AdminCrmSource) {
  if (["all", "overview", "activity", "blueprint"].includes(section)) return true;
  if (section === "documents") return source.key === "documents" || source.rows.some((row) => lc(row.title + row.sourceTitle).includes("document"));
  if (section === "support") return source.key === "support" || source.rows.some((row) => lc(row.title + row.route + row.entityType).includes("support"));
  return source.key === section;
}

function rowMatches(section: SectionKey, row: AdminCrmRow) {
  if (["all", "overview", "activity", "blueprint"].includes(section)) return true;
  if (section === "documents") return lc(row.entityType + row.title + row.sourceTitle + Object.keys(row.fields).join(" ")).includes("document");
  if (section === "support") return lc(row.entityType + row.title + row.route + row.sourceTitle).includes("support");
  return lc(row.sourceTitle + row.entityType).includes(section.replace("-", " ")) || row.sourceTitle.toLowerCase().includes(section);
}

function statusTone(status: string) {
  const value = lc(status);
  if (["approved", "active", "verified", "cleared", "complete", "completed", "connected"].some((x) => value.includes(x))) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (["reject", "blocked", "suspended", "failed", "declined"].some((x) => value.includes(x))) return "border-red-500/25 bg-red-500/10 text-red-200";
  if (["review", "new", "pending", "needs", "draft"].some((x) => value.includes(x))) return "border-gold/25 bg-gold/10 text-gold";
  return "border-white/10 bg-white/[0.04] text-chalk/70";
}

function groupCount<T>(items: T[], getter: (item: T) => string, fallback = "Unassigned") {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item).trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label: label.length > 18 ? `${label.slice(0, 18)}…` : label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function percentBreakdown(rows: AdminCrmRow[]) {
  const grouped = groupCount(rows, (row) => row.entityType);
  const total = grouped.reduce((sum, item) => sum + item.value, 0) || 1;
  return grouped.slice(0, 5).map((item, index) => ({
    label: item.label,
    value: Math.round((item.value / total) * 100),
    color: ["#D4AF37", "#C8A24A", "#8B6F2C", "#6EE7B7", "#93C5FD"][index] ?? "#D4AF37",
  }));
}

function blockPreview(block: NotionContentBlock) {
  if (block.type === "image" && block.imageUrl) {
    return <img src={block.imageUrl} alt={block.caption || "SBF WORLD Blueprint asset"} className="h-28 w-full rounded-xl object-cover" />;
  }

  if (block.type === "divider") return <div className="h-px bg-white/[0.08]" />;

  if (block.rows?.length) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/50">
        {block.rows.slice(0, 3).map((row, index) => (
          <div key={index} className="grid grid-cols-3 border-b border-white/[0.04] last:border-b-0">
            {row.slice(0, 3).map((cell, cellIndex) => (
              <div key={cellIndex} className="truncate px-3 py-2 text-xs text-muted">{cell || "—"}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="line-clamp-3 text-xs leading-relaxed text-muted">
      {block.checked !== undefined && <span className={block.checked ? "text-emerald-300" : "text-gold"}>{block.checked ? "Complete: " : "Open: "}</span>}
      {block.text || block.caption || block.type}
    </p>
  );
}

function FieldGrid({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields).filter(([, value]) => value);
  if (!entries.length) return <div className="rounded-2xl border border-white/[0.06] bg-ink-850/40 p-4 text-sm text-muted">No visible properties found.</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-white/[0.06] bg-ink-850/40 p-4">
          <div className="label-mono text-muted">{key}</div>
          <div className="mt-1 break-words text-sm text-chalk/85">{value}</div>
        </div>
      ))}
    </div>
  );
}

function PeopleDirectory({ data }: { data: AdminCrmSnapshot }) {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState<AdminCrmSnapshot["users"][number] | null>(null);
  const people = data.users.filter((user) => [user.name, user.email, user.role, user.relationshipType, user.contactId, ...Object.values(user.rawFields || {})].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <Card>
    <CardHeader title={`People & Portal Access (${data.users.length})`} sub="Every live person/login from God's Blueprint. Click any person to inspect all portal identity and access fields." />
    <div className="border-b border-white/[0.06] p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search person, email, role, Contact ID…" className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk outline-none focus:border-gold/40" /></div>
    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{people.map((user) => <button key={`${user.id}-${user.email}`} onClick={() => setPerson(user)} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left hover:border-gold/40"><div className="flex justify-between gap-3"><div><div className="font-medium text-chalk">{user.name}</div><div className="mt-1 font-mono text-xs text-muted">{user.email}</div></div><span className={`h-fit rounded-full border px-2 py-1 text-[10px] ${statusTone(user.status)}`}>{user.status}</span></div><div className="mt-3 text-xs text-gold">{user.role} · {user.relationshipType || "Portal user"}</div><div className="mt-2 text-xs text-muted">Contact ID: {text(user.contactId)} · Access: {text(user.accessLevel)}</div></button>)}</div>
    {person && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="glass max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-3xl p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><div className="label-mono text-gold">Read-only portal identity</div><h3 className="mt-2 text-2xl text-chalk">{person.name}</h3><p className="mt-1 text-sm text-muted">{person.email} · {person.role} · {person.relationshipType}</p></div><Button size="sm" variant="outline" onClick={() => setPerson(null)}>Close</Button></div><FieldGrid fields={{ Name: person.name, Email: person.email, Role: person.role, "Relationship Type": person.relationshipType, Status: person.status, "Contact ID": person.contactId || "", "Membership Tier": person.membershipTier || "", "Access Level": person.accessLevel || "", Interests: person.interests || "", "NDA Status": person.ndaStatus || "", Verification: person.verificationStatus || "", ...(person.rawFields || {}) }} /></div></div>}
  </Card>;
}

function BlueprintSection({ data, query, setQuery, onOpen }: { data: AdminCrmSnapshot; query: string; setQuery: (q: string) => void; onOpen: (module: AdminBlueprintModule) => void }) {
  const [modulePage, setModulePage] = useState(1);
  const modules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.blueprint.modules.filter((module) => {
      if (!q) return true;
      return [module.title, module.category, module.status, ...Object.values(module.fields)].join(" ").toLowerCase().includes(q);
    });
  }, [data.blueprint.modules, query]);

  useEffect(() => setModulePage(1), [query]);

  const pageCount = Math.max(1, Math.ceil(modules.length / MODULE_PAGE_SIZE));
  const pageModules = modules.slice((modulePage - 1) * MODULE_PAGE_SIZE, modulePage * MODULE_PAGE_SIZE);
  const categoryBars = groupCount(modules, (module) => module.category);
  const recordBars = groupCount(modules, (module) => module.title).map((item) => ({ ...item, value: modules.find((module) => item.label === (module.title.length > 18 ? `${module.title.slice(0, 18)}…` : module.title))?.recordCount ?? item.value }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiWidget label="Blueprint Modules" value={String(data.blueprint.totals.modules)} icon={Icon.layers(18)} />
        <KpiWidget label="Pages" value={String(data.blueprint.totals.pages)} icon={Icon.doc(18)} />
        <KpiWidget label="Data Sources" value={String(data.blueprint.totals.dataSources)} icon={Icon.market(18)} />
        <KpiWidget label="Visible Rows" value={String(data.blueprint.totals.records)} icon={Icon.grid(18)} />
        <KpiWidget label="Visible Blocks" value={String(data.blueprint.totals.blocks)} icon={Icon.pulse(18)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="God Blueprint Category Map" sub="All child pages and data sources under the main Blueprint page" />
          <div className="p-6 pt-8"><BarChart data={categoryBars.length ? categoryBars : [{ label: "No modules", value: 0 }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Visible Data Volume" sub="Rows found inside accessible Blueprint data sources" />
          <div className="p-6 pt-8"><BarChart data={recordBars.length ? recordBars : [{ label: "No rows", value: 0 }]} /></div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={data.blueprint.title}
          sub="Admin-only full access map from the main God’s Blueprint page and its visible child pages/databases"
          action={data.blueprint.openUrl ? <a className="text-xs text-gold hover:underline" href={data.blueprint.openUrl} target="_blank" rel="noreferrer">Open root in Notion</a> : null}
        />
        <div className="border-b border-white/[0.06] p-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Blueprint pages, CORE tables, portal templates, snapshots…"
            className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk outline-none placeholder:text-muted/60 focus:border-gold/40"
          />
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {pageModules.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/[0.06] bg-ink-850/40 p-8 text-center text-muted">No God Blueprint modules are visible. Share the root page and child pages/databases with SBF WORLD Platform.</div>
          ) : (
            pageModules.map((module) => (
              <button
                key={module.id}
                onClick={() => onOpen(module)}
                className="group rounded-3xl border border-white/[0.07] bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_32%),rgba(12,12,12,0.86)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-glow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="label-mono text-gold">{module.category}</div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-chalk group-hover:text-gold">{module.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${statusTone(module.status)}`}>{module.type}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Rows</div><div className="mt-1 text-lg font-semibold text-chalk">{module.recordCount}</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Blocks</div><div className="mt-1 text-lg font-semibold text-chalk">{module.blockCount}</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Child</div><div className="mt-1 text-lg font-semibold text-chalk">{module.childCount}</div></div>
                </div>
                <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-muted">{module.status}. Admin can inspect page blocks, visible properties, and database rows. Non-admin portals remain scoped.</p>
              </button>
            ))
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {modules.length ? (modulePage - 1) * MODULE_PAGE_SIZE + 1 : 0}–{Math.min(modulePage * MODULE_PAGE_SIZE, modules.length)} of {modules.length}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={modulePage <= 1} onClick={() => setModulePage((p) => Math.max(1, p - 1))}>Previous</Button>
            <span className="font-mono text-xs text-gold">Page {modulePage} / {pageCount}</span>
            <Button size="sm" variant="outline" disabled={modulePage >= pageCount} onClick={() => setModulePage((p) => Math.min(pageCount, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


function AdminCommandHero({ data, adminEmail, onRefresh }: { data: AdminCrmSnapshot | null; adminEmail: string; onRefresh: () => void }) {
  const totalVisibleAmount = useMemo(() => (data?.rows ?? []).reduce((sum, row) => sum + parseAdminAmount(row.value), 0), [data?.rows]);
  const liveSources = data?.sources.filter((source) => source.dataSourceId).length ?? 0;
  const totalSources = data?.sources.length ?? 0;

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-[2.5rem] border border-gold/20 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.24),transparent_34rem),radial-gradient(circle_at_90%_20%,rgba(110,231,183,0.09),transparent_24rem),linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_48%,rgba(0,0,0,0.38))] p-6 shadow-[0_36px_120px_-64px_rgba(212,175,55,0.85)] md:p-8 xl:p-10">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="relative z-10 grid gap-8 2xl:grid-cols-[1.05fr_0.95fr] 2xl:items-stretch">
        <div className="flex min-h-[360px] flex-col justify-between rounded-[2rem] border border-white/[0.065] bg-black/25 p-6 md:p-8">
          <div>
            <div className="label-mono text-gold">Crystal / Aly · Founder-grade command</div>
            <h2 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-chalk md:text-5xl xl:text-6xl">
              SBF WORLD Admin Command Center
            </h2>
            <p className="mt-5 max-w-4xl text-base leading-7 text-chalk/68">
              One premium control tower for God’s Blueprint, every CORE database, every partner submission, every match, every asset, every buy box, every document route, and every approval gate. Admin can review, approve, lock, reject, and audit everything; partner portals stay scoped like they should, because data leaks are not a feature.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-gold/20 bg-gold/[0.08] p-5">
              <div className="label-mono text-muted">CRM Rows</div>
              <div className="mt-2 text-3xl font-semibold text-gold">{data?.totals.totalRows ?? "—"}</div>
              <p className="mt-1 text-xs text-muted">All visible admin records</p>
            </div>
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
              <div className="label-mono text-muted">Pending Review</div>
              <div className="mt-2 text-3xl font-semibold text-chalk">{data?.totals.pendingReview ?? "—"}</div>
              <p className="mt-1 text-xs text-muted">Needs admin action</p>
            </div>
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
              <div className="label-mono text-muted">Approved</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-200">{data?.totals.approved ?? "—"}</div>
              <p className="mt-1 text-xs text-muted">Cleared or active</p>
            </div>
            <div className="rounded-3xl border border-sky-300/20 bg-sky-300/[0.07] p-5">
              <div className="label-mono text-muted">Locked</div>
              <div className="mt-2 text-3xl font-semibold text-sky-200">{data?.totals.locked ?? "—"}</div>
              <p className="mt-1 text-xs text-muted">Project locked records</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <div className="rounded-[2rem] border border-white/[0.07] bg-black/30 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="label-mono text-muted">Authenticated admin</div>
                <div className="mt-1 text-sm font-semibold text-chalk">{adminEmail || "Admin session"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={onRefresh}>Refresh CRM</Button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="label-mono text-muted">People</div><div className="mt-1 text-2xl font-semibold text-gold">{data?.totals.users ?? "—"}</div></div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="label-mono text-muted">Submissions</div><div className="mt-1 text-2xl font-semibold text-gold">{data?.totals.submissions ?? "—"}</div></div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="label-mono text-muted">Assets</div><div className="mt-1 text-2xl font-semibold text-gold">{data?.totals.assets ?? "—"}</div></div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="label-mono text-muted">Matches</div><div className="mt-1 text-2xl font-semibold text-gold">{data?.totals.matches ?? "—"}</div></div>
              <div className="col-span-2 rounded-2xl border border-gold/20 bg-gold/[0.06] p-4"><div className="label-mono text-muted">Total Visible Amount</div><div className="mt-1 text-3xl font-semibold text-gold">{compactAdminMoney(totalVisibleAmount)}</div></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.07] bg-black/30 p-6">
            <div className="label-mono text-gold">Approval engine</div>
            <div className="mt-4 space-y-3 text-sm text-muted">
              {[
                `Connected SBF WORLD sources: ${liveSources}/${totalSources}`,
                `Full reveal requests: ${data?.totals.fullRevealRequests ?? "—"}`,
                "Approved full reveals trigger partner notifications.",
                "Project locks freeze sensitive records for admin review.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSourceRail({ sources }: { sources: AdminCrmSource[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sources.map((source) => (
        <div key={source.key} className="sbf-premium-card rounded-3xl p-4">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="label-mono text-gold">{source.entityType}</div>
              <div className="mt-2 line-clamp-2 text-sm font-semibold text-chalk">{source.title}</div>
            </div>
            <div className="rounded-xl border border-gold/20 bg-gold/10 px-2.5 py-1 text-sm font-semibold text-gold">{source.rows.length}</div>
          </div>
          <div className="relative z-10 mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-gradient-to-r from-gold to-emerald-300" style={{ width: source.dataSourceId ? "100%" : "24%" }} /></div>
          <div className="relative z-10 mt-2 text-[11px] text-muted">{source.dataSourceId ? "Connected to SBF WORLD" : "Not shared / not found"}</div>
        </div>
      ))}
    </div>
  );
}

function AdminActivityLedger({ rows, users }: { rows: AdminCrmRow[]; users: AdminCrmSnapshot["users"] }) {
  const people = useMemo(() => {
    const map = new Map<string, {
      label: string;
      email: string;
      role: string;
      contactId: string;
      records: number;
      submissions: number;
      assets: number;
      matches: number;
      amount: number;
      pending: number;
      approved: number;
      locked: number;
    }>();

    const personForRow = (row: AdminCrmRow) => {
      const email = row.email?.trim().toLowerCase();
      const byEmail = email ? users.find((user) => user.email === email) : undefined;
      const byContact = row.contactId ? users.find((user) => user.contactId && user.contactId === row.contactId) : undefined;
      const user = byEmail ?? byContact;
      const key = user?.email || email || row.owner || row.partnerScope || "unassigned";
      return {
        key,
        label: user?.name || row.owner || row.partnerScope || email || "Unassigned",
        email: user?.email || email || row.email || "",
        role: user?.role || row.role || "—",
        contactId: user?.contactId || row.contactId || "",
      };
    };

    rows.forEach((row) => {
      const person = personForRow(row);
      const current = map.get(person.key) ?? {
        label: person.label,
        email: person.email,
        role: person.role,
        contactId: person.contactId,
        records: 0,
        submissions: 0,
        assets: 0,
        matches: 0,
        amount: 0,
        pending: 0,
        approved: 0,
        locked: 0,
      };
      current.records += 1;
      current.amount += parseAdminAmount(row.value);
      if (lc(row.entityType + row.sourceTitle).includes("submission")) current.submissions += 1;
      if (lc(row.entityType + row.sourceTitle).includes("asset")) current.assets += 1;
      if (lc(row.entityType + row.sourceTitle).includes("matching")) current.matches += 1;
      if (["new", "pending", "review", "needs"].some((status) => lc(row.status).includes(status))) current.pending += 1;
      if (["approved", "active", "verified", "cleared"].some((status) => lc(row.status).includes(status))) current.approved += 1;
      if (["locked", "closed", "complete"].some((status) => lc(row.status).includes(status))) current.locked += 1;
      map.set(person.key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.records - a.records || b.amount - a.amount).slice(0, 40);
  }, [rows, users]);

  return (
    <Card className="overflow-hidden border-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_30rem)]">
      <CardHeader
        title="Member & Partner Activity Ledger"
        sub="Admin-only rollup of what every partner/member is doing: submissions, assets, matching engine records, pending reviews, approvals, locks, and total visible amount."
      />
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {people.slice(0, 8).map((person) => (
          <div key={`${person.email}-${person.label}`} className="sbf-premium-card rounded-3xl p-5">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="label-mono text-gold">{person.role}</div>
                <div className="mt-2 truncate text-base font-semibold text-chalk">{person.label}</div>
                <div className="mt-1 truncate font-mono text-[11px] text-muted">{person.email || person.contactId || "No email"}</div>
              </div>
              <div className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2 text-right">
                <div className="text-lg font-semibold text-gold">{person.records}</div>
                <div className="label-mono text-muted">Records</div>
              </div>
            </div>
            <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Submissions</div><div className="mt-1 text-chalk">{person.submissions}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Assets</div><div className="mt-1 text-chalk">{person.assets}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Matches</div><div className="mt-1 text-chalk">{person.matches}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Amount</div><div className="mt-1 text-chalk">{compactAdminMoney(person.amount)}</div></div>
            </div>
            <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] text-gold">Pending {person.pending}</span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-200">Approved {person.approved}</span>
              <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[11px] text-sky-200">Locked {person.locked}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="sbf-scroll max-h-[420px] overflow-auto border-t border-white/[0.06]">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 bg-ink-900"><tr>{["Person", "Role", "Records", "Submissions", "Assets", "Matches", "Pending", "Approved", "Locked", "Visible Amount"].map((heading) => <th key={heading} className="label-mono px-5 py-3 text-left font-normal text-muted">{heading}</th>)}</tr></thead>
          <tbody>
            {people.map((person) => (
              <tr key={`${person.email}-${person.label}-row`} className="border-t border-white/[0.04] hover:bg-gold/[0.035]">
                <td className="px-5 py-4"><div className="text-chalk">{person.label}</div><div className="mt-1 font-mono text-[11px] text-muted">{person.email || person.contactId || "—"}</div></td>
                <td className="px-5 py-4 text-xs text-muted">{person.role}</td>
                <td className="px-5 py-4 text-chalk">{person.records}</td>
                <td className="px-5 py-4 text-chalk">{person.submissions}</td>
                <td className="px-5 py-4 text-chalk">{person.assets}</td>
                <td className="px-5 py-4 text-chalk">{person.matches}</td>
                <td className="px-5 py-4 text-gold">{person.pending}</td>
                <td className="px-5 py-4 text-emerald-200">{person.approved}</td>
                <td className="px-5 py-4 text-sky-200">{person.locked}</td>
                <td className="px-5 py-4 font-mono text-xs text-chalk/80">{compactAdminMoney(person.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


function isAdminApprovalCandidate(row: AdminCrmRow) {
  // The request description remains "submitted" after a decision, so status must
  // be checked first. Otherwise approved requests never leave the approval inbox.
  const status = normalizeAdminText(row.status);
  if (/approved|active|cleared|verified|rejected|declined|denied|project locked|closed|completed/.test(status)) return false;
  const haystack = normalizeAdminText(`${row.title} ${row.entityType} ${row.sourceTitle} ${row.status} ${row.route} ${Object.values(row.fields).join(" ")}`);
  return [
    "full reveal",
    "lock request",
    "request lock",
    "project lock",
    "new",
    "pending",
    "in review",
    "needs docs",
    "admin review",
    "submitted",
  ].some((token) => haystack.includes(token));
}

function normalizeAdminText(value: string) {
  return value.toLowerCase().replace(/[—–]/g, "-").replace(/[^a-z0-9@.$%\s-]+/g, " ").replace(/\s+/g, " ").trim();
}

function AdminApprovalInbox({ rows, onOpen, onStatus, updating }: { rows: AdminCrmRow[]; onOpen: (row: AdminCrmRow) => void; onStatus: (row: AdminCrmRow, status: string) => void; updating: string }) {
  const requestRows = useMemo(() => rows.filter(isAdminApprovalCandidate).sort((a, b) => {
    const priority = (row: AdminCrmRow) => /add to my matches|matching request|submitted for review/i.test(`${row.title} ${row.status} ${row.route} ${Object.values(row.fields).join(" ")}`) ? 1 : 0;
    const priorityDifference = priority(b) - priority(a);
    if (priorityDifference) return priorityDifference;
    return String(b.updated || b.fields["Last Updated"] || b.fields["Submitted At"] || "").localeCompare(String(a.updated || a.fields["Last Updated"] || a.fields["Submitted At"] || ""));
  }).slice(0, 12), [rows]);

  return (
    <Card className="overflow-hidden border-gold/25 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))]">
      <CardHeader
        title="Admin Approval Inbox"
        sub="Live queue for Brad/partner full reveal requests, lock requests, new submissions, matching actions, buy boxes, assets, and document reviews. Approvals update SBF WORLD so the partner notification bell can show the result after refresh."
        action={<span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold">{requestRows.length} priority</span>}
      />
      <div className="grid gap-4 p-5 xl:grid-cols-3">
        {requestRows.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/[0.07] bg-black/20 p-8 text-center text-sm text-muted">
            No priority approval requests found yet. If Brad sends a Matching Engine full reveal or lock request, it should appear here from Partner Submissions — CORE.
          </div>
        ) : requestRows.map((row) => {
          const requestAction = row.fields["Request Action"] || row.fields["Submission Type"] || row.route || row.entityType;
          return (
            <div key={`approval-${row.id}`} className="group rounded-[1.6rem] border border-white/[0.08] bg-black/28 p-5 shadow-[0_24px_80px_-55px_rgba(212,175,55,0.9)] transition hover:-translate-y-0.5 hover:border-gold/35 hover:bg-gold/[0.045]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="label-mono text-gold">{requestAction}</div>
                  <button onClick={() => onOpen(row)} className="mt-2 block text-left">
                    <h3 className="line-clamp-2 text-lg font-semibold text-chalk group-hover:text-gold">{row.title}</h3>
                  </button>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{row.email || row.contactId || row.owner || "Partner scoped"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${statusTone(row.status)}`}>{text(row.status)}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-black/22 p-3"><div className="label-mono text-muted">Target</div><div className="mt-1 line-clamp-1 text-chalk/85">{text(row.fields["Target Record Title"] || row.fields["Asset / Match / Item Name"] || row.title)}</div></div>
                <div className="rounded-xl border border-white/[0.06] bg-black/22 p-3"><div className="label-mono text-muted">Source</div><div className="mt-1 line-clamp-1 text-chalk/85">{text(row.fields["Target Source"] || row.sourceTitle)}</div></div>
                <div className="rounded-xl border border-white/[0.06] bg-black/22 p-3"><div className="label-mono text-muted">Value</div><div className="mt-1 text-chalk/85">{text(row.value)}</div></div>
                <div className="rounded-xl border border-white/[0.06] bg-black/22 p-3"><div className="label-mono text-muted">Route</div><div className="mt-1 line-clamp-1 text-chalk/85">{text(row.route)}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                <button disabled={Boolean(updating)} onClick={() => onStatus(row, /match/i.test(requestAction) ? "Approved" : "Full Reveal Approved")} className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-40">{/match/i.test(requestAction) ? "Approve match" : "Approve reveal"}</button>
                <button disabled={Boolean(updating)} onClick={() => onStatus(row, "Project Locked")} className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-40">Lock project</button>
                <button disabled={Boolean(updating)} onClick={() => onStatus(row, "Needs Docs")} className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs text-gold transition hover:bg-gold/15 disabled:opacity-40">Needs docs</button>
                <button onClick={() => onOpen(row)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-muted transition hover:border-gold/40 hover:text-gold">Full see</button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AdminWorkQueue({
  rows,
  page,
  pageCount,
  setPage,
  onOpen,
  onStatus,
  updating,
}: {
  rows: AdminCrmRow[];
  page: number;
  pageCount: number;
  setPage: (updater: (page: number) => number) => void;
  onOpen: (row: AdminCrmRow) => void;
  onStatus: (row: AdminCrmRow, status: string) => void;
  updating: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Admin Work Queue" sub="20 records per page, card-based review with status actions for assets, matching, submissions, people, documents, and buy boxes." />
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/[0.06] bg-white/[0.025] p-10 text-center text-muted">No CRM records found for this section.</div>
        ) : rows.map((row) => (
          <div key={`${row.sourceTitle}-${row.id}`} className="sbf-premium-card rounded-3xl p-5">
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(row.status)}`}>{text(row.status)}</span>
                  <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-muted">{row.entityType}</span>
                </div>
                <button onClick={() => onOpen(row)} className="mt-3 block text-left">
                  <h3 className="line-clamp-2 text-base font-semibold text-chalk hover:text-gold">{row.title}</h3>
                </button>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{row.sourceTitle}</p>
              </div>
              <div className="shrink-0 rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2 text-right">
                <div className="text-sm font-semibold text-gold">{text(row.value)}</div>
                <div className="label-mono text-muted">Value</div>
              </div>
            </div>
            <div className="relative z-10 mt-5 grid gap-2 text-xs md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Owner</div><div className="mt-1 truncate text-chalk/80">{text(row.owner)}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Email</div><div className="mt-1 truncate font-mono text-[11px] text-chalk/80">{text(row.email)}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Market</div><div className="mt-1 truncate text-chalk/80">{text(row.geography)}</div></div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Route</div><div className="mt-1 truncate text-chalk/80">{text(row.route)}</div></div>
            </div>
            <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
              {ADMIN_ACTION_STATUSES.map((status) => (
                <button key={status} disabled={Boolean(updating)} onClick={() => onStatus(row, status)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-gold/40 hover:text-gold disabled:opacity-40">
                  {updating === `${row.id}:${status}` ? "…" : status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Cards are aligned for CRM review. Large datasets stay paginated at 20 records.</span>
        <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button><span className="font-mono text-xs text-gold">Page {page} / {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button></div>
      </div>
    </Card>
  );
}

export default function AdminCrmPanel() {
  const { session } = useSession();
  const [data, setData] = useState<AdminCrmSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState<SectionKey>("overview");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminCrmRow | null>(null);
  const [moduleDetail, setModuleDetail] = useState<AdminBlueprintModule | null>(null);
  const [updating, setUpdating] = useState("");

  const adminEmail = session?.email?.toLowerCase() ?? "";
  const isAllowedAdmin = ADMIN_EMAILS.includes(adminEmail);

  const load = async () => {
    if (!adminEmail) return;
    setLoading(true);
    setError("");
    try {
      const snapshot = await fetchAdminCrmSnapshot(adminEmail);
      setData(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Admin CRM.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail]);

  useEffect(() => setPage(1), [section, query]);

  const visibleSources = useMemo(() => data?.sources.filter((source) => sourceMatches(section, source)) ?? [], [data, section]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sourceKeys = new Set(visibleSources.map((source) => source.key));
    return (data?.rows ?? [])
      .filter((row) => rowMatches(section, row) || sourceKeys.has(row.sourceTitle))
      .filter((row) => {
        if (!q || section === "blueprint") return true;
        const haystack = [row.title, row.entityType, row.sourceTitle, row.status, row.owner, row.email, row.contactId, row.partnerScope, ...Object.values(row.fields)].join(" ").toLowerCase();
        return haystack.includes(q);
      });
  }, [data, visibleSources, section, query]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const statusBars = groupCount(visibleRows, (row) => row.status);
  const sourceBars = groupCount(visibleRows, (row) => row.sourceTitle);
  const entityMix = percentBreakdown(visibleRows);

  const changeStatus = async (row: AdminCrmRow, status: string) => {
    setUpdating(`${row.id}:${status}`);
    setError("");
    try {
      await updateAdminCrmStatus(adminEmail, row.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setUpdating("");
    }
  };

  if (!isAllowedAdmin) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">✕</div>
        <h2 className="text-lg font-medium text-chalk">Admin access restricted</h2>
        <p className="mt-1.5 text-sm text-muted">Only Crystal and Aly can open the full CRM admin panel.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1900px] space-y-8">
      <PageHeader
        eyebrow="Admin OS · God Blueprint Full Access"
        title="SBF WORLD Founder / Admin Command Center"
        desc="Crystal and Aly get full admin access to God’s Blueprint, every CORE table, every portal template, every partner command center, and the CRM operating data. Partners remain scoped to their own records, because we are building a CRM, not a data-confetti cannon."
      />

      <AdminCommandHero data={data} adminEmail={adminEmail} onRefresh={load} />

      <div className="grid gap-5 lg:grid-cols-[292px_1fr]">
        <Card className="h-fit p-3 lg:sticky lg:top-24">
          <div className="px-3 py-2 label-mono text-muted">Admin Navigation</div>
          <div className="space-y-1">
            {ADMIN_SECTIONS.map((item) => {
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all ${active ? "border-gold/35 bg-gold/10 text-gold shadow-glow-sm" : "border-transparent text-chalk/70 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-chalk"}`}
                >
                  <span>{item.icon(17)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-[10px] text-muted">{item.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-relaxed text-emerald-100">
            Admin mode can inspect all God Blueprint pages and all CORE records. User portals still filter by Contact ID, email, partner scope, and assigned portal.
          </div>
        </Card>

        <div className="space-y-6">
          {loading && <Card className="p-8 text-center text-muted">Loading God Blueprint and full CRM from SBF WORLD…</Card>}
          {error && <Card className="border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">{error}</Card>}

          {data && section === "blueprint" && <BlueprintSection data={data} query={query} setQuery={setQuery} onOpen={setModuleDetail} />}

          {data && section === "activity" && <AdminActivityLedger rows={data.rows} users={data.users} />}

          {data && section === "people" && <PeopleDirectory data={data} />}

          {data && !["blueprint", "activity", "people"].includes(section) && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiWidget label="Total CRM Rows" value={String(data.totals.totalRows)} icon={Icon.layers(18)} />
                <KpiWidget label="People / Logins" value={String(data.totals.users)} icon={Icon.users(18)} />
                <KpiWidget label="Submissions" value={String(data.totals.submissions)} icon={Icon.plus(18)} />
                <KpiWidget label="Pending Review" value={String(data.totals.pendingReview)} icon={Icon.shield(18)} />
              </div>

              {(section === "overview" || section === "submissions" || section === "matching" || section === "all") && (
                <AdminApprovalInbox rows={visibleRows} onOpen={setDetail} onStatus={changeStatus} updating={updating} />
              )}

              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader title="Status Breakdown" sub="Live count by review/status field across the selected admin section" />
                  <div className="p-6 pt-8"><BarChart data={statusBars.length ? statusBars : [{ label: "No rows", value: 0 }]} /></div>
                </Card>
                <Card>
                  <CardHeader title="CRM Mix" sub="Composition by record type" />
                  <div className="flex items-center justify-center p-6"><DonutChart data={entityMix.length ? entityMix : [{ label: "No rows", value: 100, color: "#D4AF37" }]} /></div>
                </Card>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><div className="label-mono text-gold">Connected CRM Sources</div><p className="mt-1 text-sm text-muted">SBF WORLD data sources visible to the admin panel.</p></div>
                  <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
                </div>
                <AdminSourceRail sources={data.sources} />
              </div>

              <AdminWorkQueue rows={pagedRows} page={page} pageCount={pageCount} setPage={setPage} onOpen={setDetail} onStatus={changeStatus} updating={updating} />

              <Card>
                <CardHeader title={ADMIN_SECTIONS.find((item) => item.key === section)?.label ?? "CRM Records"} sub="Audit table view for exact fields and dense checking" action={<span className="label-mono text-muted">{visibleRows.length} visible</span>} />
                <div className="border-b border-white/[0.06] p-4">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, Contact ID, asset, status, route…" className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk outline-none placeholder:text-muted/60 focus:border-gold/40" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead className="sticky top-0 bg-ink-900"><tr className="border-b border-white/[0.06]">{["Record", "Type", "Owner", "Email", "Status", "Value", "Market", "Route", "Actions"].map((heading) => <th key={heading} className="label-mono px-5 py-3 text-left font-normal text-muted">{heading}</th>)}</tr></thead>
                    <tbody>
                      {pagedRows.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center text-muted">No admin CRM records found for this view.</td></tr> : pagedRows.map((row) => (
                        <tr key={`${row.sourceTitle}-${row.id}`} className="border-b border-white/[0.04] transition-colors hover:bg-gold/[0.04]">
                          <td className="px-5 py-4"><button onClick={() => setDetail(row)} className="text-left"><div className="max-w-[220px] truncate text-chalk hover:text-gold">{row.title}</div><div className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-muted">{row.contactId || row.sourceTitle}</div></button></td>
                          <td className="px-5 py-4 text-xs text-muted">{row.entityType}</td>
                          <td className="px-5 py-4 text-xs text-chalk/80">{text(row.owner)}</td>
                          <td className="px-5 py-4 font-mono text-[11px] text-muted">{text(row.email)}</td>
                          <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(row.status)}`}>{text(row.status)}</span></td>
                          <td className="px-5 py-4 font-mono text-[11px] text-chalk/80">{text(row.value)}</td>
                          <td className="px-5 py-4 text-xs text-muted">{text(row.geography)}</td>
                          <td className="px-5 py-4 text-xs text-muted">{text(row.route)}</td>
                          <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{ADMIN_ACTION_STATUSES.map((status) => <button key={status} disabled={Boolean(updating)} onClick={() => changeStatus(row, status)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40">{updating === `${row.id}:${status}` ? "…" : status}</button>)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                  <span>Showing {visibleRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}</span>
                  <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button><span className="font-mono text-xs text-gold">Page {page} / {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button></div>
                </div>
              </Card>

              <Card><CardHeader title="Source Volume" sub="Where the current admin view is pulling data from" /><div className="p-6 pt-8"><BarChart data={sourceBars.length ? sourceBars : [{ label: "No sources", value: 0 }]} /></div></Card>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="glass max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl shadow-glow">
              <div className="flex flex-col gap-5 border-b border-white/[0.06] p-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="label-mono text-gold">Full SBF WORLD record · {detail.entityType} · {detail.sourceTitle}</div>
                  <h3 className="mt-2 text-2xl font-semibold text-chalk">{detail.title}</h3>
                  <p className="mt-1 text-sm text-muted">Owner: {text(detail.owner)} · Email: {text(detail.email)} · Contact ID: {text(detail.contactId)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_ACTION_STATUSES.map((status) => (
                    <button
                      key={status}
                      disabled={Boolean(updating)}
                      onClick={() => changeStatus(detail, status)}
                      className="rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-2 text-xs text-gold transition hover:bg-gold/[0.12] disabled:opacity-40"
                    >
                      {updating === `${detail.id}:${status}` ? "Updating…" : status}
                    </button>
                  ))}
                  <button onClick={() => setDetail(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted hover:border-gold/40 hover:text-gold">Close</button>
                </div>
              </div>
              <div className="max-h-[64vh] overflow-y-auto p-6">
                <div className="mb-5 rounded-2xl border border-gold/20 bg-gold/[0.06] p-4 text-sm leading-6 text-chalk/75">
                  Use <span className="text-gold">Full Reveal Approved</span> to notify the scoped partner that deeper teaser/reveal details are cleared. Use <span className="text-gold">Project Locked</span> to lock an asset, buy box, teaser, or matching request for admin review. The partner notification bar reads this status from SBF WORLD after refresh.
                </div>
                <FieldGrid fields={detail.fields} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {moduleDetail && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="glass max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-3xl shadow-glow">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-6">
                <div><div className="label-mono text-gold">{moduleDetail.category} · {moduleDetail.type}</div><h3 className="mt-2 text-xl font-semibold text-chalk">{moduleDetail.title}</h3><p className="mt-1 text-sm text-muted">{moduleDetail.status} · {moduleDetail.recordCount} rows · {moduleDetail.blockCount} visible blocks</p></div>
                <div className="flex gap-2"><a href={moduleDetail.openUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-gold/30 px-3 py-2 text-sm text-gold hover:bg-gold/10">Open in Notion</a><button onClick={() => setModuleDetail(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted hover:border-gold/40 hover:text-gold">Close</button></div>
              </div>
              <div className="max-h-[68vh] overflow-y-auto p-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-4"><KpiWidget label="Rows" value={String(moduleDetail.recordCount)} icon={Icon.grid(18)} /><KpiWidget label="Blocks" value={String(moduleDetail.blockCount)} icon={Icon.doc(18)} /><KpiWidget label="Child Items" value={String(moduleDetail.childCount)} icon={Icon.layers(18)} /><KpiWidget label="Access" value={moduleDetail.status.includes("no visible") ? "Limited" : "Open"} icon={Icon.shield(18)} /></div>
                <div><h4 className="mb-3 text-sm font-semibold text-chalk">Visible Properties</h4><FieldGrid fields={moduleDetail.fields} /></div>
                {moduleDetail.blocks.length > 0 && <div><h4 className="mb-3 text-sm font-semibold text-chalk">Page Content Preview</h4><div className="grid gap-3 md:grid-cols-2">{moduleDetail.blocks.slice(0, 12).map((block) => <div key={block.id} className="rounded-2xl border border-white/[0.06] bg-ink-850/40 p-4">{blockPreview(block)}</div>)}</div></div>}
                {moduleDetail.rows.length > 0 && <div><h4 className="mb-3 text-sm font-semibold text-chalk">Visible Database Rows</h4><div className="overflow-x-auto rounded-2xl border border-white/[0.06]"><table className="w-full min-w-[900px] text-sm"><thead className="bg-ink-900"><tr>{["Record", "Status", "Owner", "Email", "Value", "Market", "Route"].map((heading) => <th key={heading} className="label-mono px-4 py-3 text-left text-muted">{heading}</th>)}</tr></thead><tbody>{moduleDetail.rows.slice(0, 40).map((row) => <tr key={row.id} className="border-t border-white/[0.04]"><td className="px-4 py-3 text-chalk">{row.title}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(row.status)}`}>{text(row.status)}</span></td><td className="px-4 py-3 text-muted">{text(row.owner)}</td><td className="px-4 py-3 font-mono text-[11px] text-muted">{text(row.email)}</td><td className="px-4 py-3 text-muted">{text(row.value)}</td><td className="px-4 py-3 text-muted">{text(row.geography)}</td><td className="px-4 py-3 text-muted">{text(row.route)}</td></tr>)}</tbody></table></div></div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
