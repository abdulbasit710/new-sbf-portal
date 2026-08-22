"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";
import type { DynamicPortalPage } from "@/lib/notionService";

const strip = (value = "") => value.replace(/-/g, "").toLowerCase();
const relationIds = (value = "") => value.split(",").map(strip).filter(Boolean);
const field = (fields: Record<string, string>, names: string[]) => Object.entries(fields).find(([key]) => names.some((name) => key.toLowerCase() === name.toLowerCase()))?.[1] || "";

export default function InvestorBuyBoxes({ investorId }: { investorId: string }) {
  const { session } = useSession();
  const [portal, setPortal] = useState<DynamicPortalPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.email) return;
    void fetch("/api/notion/portal/current", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store" })
      .then(async (response) => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error); setPortal(payload.data); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load investor buy boxes."));
  }, [session?.email]);

  const data = useMemo(() => {
    const section = (key: string) => portal?.sections.find((item) => item.key === key)?.rows || [];
    const investor = section("investors").find((row) => strip(row.id) === strip(investorId));
    const buyBoxes = section("buy-box-signals").filter((row) => relationIds(field(row.fields, ["Owner / Capital Relationship", "Owner Capital Relationship"])).includes(strip(investorId)));
    const boxIds = new Set(buyBoxes.map((row) => strip(row.id)));
    const matches = section("active-matches").filter((row) => relationIds(field(row.fields, ["Related Investor / Lender", "Related Investor"])).includes(strip(investorId)) || relationIds(field(row.fields, ["Related Buy Box / Mandate", "Related Buy Box"])).some((id) => boxIds.has(id)));
    return { investor, buyBoxes, matches };
  }, [investorId, portal]);

  if (error) return <Card className="border-red-400/25 p-6 text-red-200">{error}</Card>;
  if (!portal) return <Card className="p-8 text-center text-muted">Loading New Build Zone…</Card>;
  if (!data.investor) return <Card className="p-8 text-center text-muted">This investor is not available in the current approved CORE scope.</Card>;

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-gold/20 bg-gold/[0.055] p-6">
      <Link href="/investors" className="text-sm text-gold">← Back to investors</Link>
      <div className="mt-5 flex items-center gap-4"><span className="rounded-2xl bg-gold/10 p-3 text-gold">{Icon.trend(26)}</span><div><div className="label-mono text-gold">Investor buy boxes</div><h1 className="mt-1 text-3xl font-semibold text-chalk">{data.investor.title}</h1></div></div>
      <p className="mt-3 text-sm text-muted">Live mandates and founder-approved matches from the canonical CORE databases.</p>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">{data.buyBoxes.map((box) => <Card key={box.id} className="overflow-hidden border-gold/15 p-5">
      <div className="label-mono text-gold">Buy box / mandate</div><h2 className="mt-2 text-xl font-semibold text-chalk">{box.title}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(box.fields).filter(([, value]) => value).slice(0, 10).map(([key, value]) => <Link key={key} href={`/portal-record/${box.id}?field=${encodeURIComponent(key)}`} className="rounded-xl border border-white/[.07] p-3 transition hover:border-gold/35"><div className="text-[10px] uppercase tracking-wider text-muted">{key}</div><div className="mt-1 truncate text-sm text-chalk">{value}</div></Link>)}</div>
    </Card>)}</div>
    {!data.buyBoxes.length && <Card className="p-8 text-center text-muted">No active, match-ready buy box is related to this investor in CORE.</Card>}
    <Card className="overflow-hidden border-gold/15"><div className="border-b border-white/[0.06] p-5"><div className="label-mono text-gold">Investor matches</div><h2 className="mt-2 text-xl font-semibold text-chalk">Related approved matches</h2></div>
      {data.matches.length ? <div className="grid gap-3 p-5 md:grid-cols-2">{data.matches.map((match) => <Link key={match.id} href={`/portal-record/${match.id}`} className="flex items-center justify-between rounded-xl border border-white/[.07] p-4 text-sm transition hover:border-gold/35"><span className="font-medium text-chalk">{match.title}</span><span className="text-gold">Open →</span></Link>)}</div> : <div className="p-6 text-sm text-muted">No founder-approved, visibility-allowed match is related to this investor.</div>}
    </Card>
  </div>;
}
