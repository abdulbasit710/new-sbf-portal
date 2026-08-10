"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";
import type { DynamicPortalPage, PortalDatabaseRow } from "@/lib/notionService";

const norm = (value = "") => value.toLowerCase().replace(/-/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const text = (row: PortalDatabaseRow) => norm(`${row.id} ${row.title} ${Object.values(row.fields).join(" ")}`);
const related = (row: PortalDatabaseRow, target: PortalDatabaseRow) => {
  const haystack = text(row);
  return haystack.includes(norm(target.id)) || (norm(target.title).length > 2 && haystack.includes(norm(target.title)));
};

export default function InvestorBuyBoxes({ investorId }: { investorId: string }) {
  const { session } = useSession();
  const [portal, setPortal] = useState<DynamicPortalPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.email) return;
    void fetch("/api/notion/portal/current", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.email, user: session }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load God’s Blueprint.");
      setPortal(payload.data);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load investor buy boxes."));
  }, [session?.email]);

  const data = useMemo(() => {
    const rows = (key: string) => portal?.sections.find((section) => section.key === key)?.rows ?? [];
    const investor = rows("investors").find((row) => norm(row.id) === norm(investorId));
    const buyBoxes = investor ? rows("buy-box-signals").filter((row) => related(row, investor)) : [];
    const matches = investor
      ? rows("active-matches").filter((match) => related(match, investor) || buyBoxes.some((box) => related(match, box)))
      : [];
    return { investor, buyBoxes, matches };
  }, [investorId, portal]);

  if (error) return <Card className="border-red-400/25 p-6 text-red-200">{error}</Card>;
  if (!portal) return <Card className="p-8 text-center text-muted">Loading God’s Blueprint…</Card>;
  if (!data.investor) return <Card className="p-8 text-center text-muted">This investor is not available in Brad’s God’s Blueprint scope.</Card>;

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-gold/20 bg-gold/[0.055] p-6">
      <Link href="/investors" className="text-sm text-gold">← Back to investors</Link>
      <div className="mt-5 flex items-center gap-4"><span className="rounded-2xl bg-gold/10 p-3 text-gold">{Icon.trend(26)}</span><div><div className="label-mono text-gold">Investor buy boxes</div><h1 className="mt-1 text-3xl font-semibold text-chalk">{data.investor.title}</h1></div></div>
      <p className="mt-3 text-sm text-muted">All mandates and related matches sourced only from God’s Blueprint and scoped to Brad Gaubert.</p>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      {data.buyBoxes.map((box) => {
        const matches = data.matches.filter((match) => related(match, box) || related(match, data.investor!));
        return <Card key={box.id} className="overflow-hidden border-gold/15 p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="label-mono text-gold">Buy box / mandate</div><h2 className="mt-2 text-xl font-semibold text-chalk">{box.title}</h2></div><span className="rounded-full border border-gold/20 px-3 py-1 text-xs text-gold">{matches.length} matches</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(box.fields).filter(([,v])=>v).slice(0,8).map(([key,value])=><Link key={key} href={`/portal-record/${box.id}?field=${encodeURIComponent(key)}`} className="rounded-xl border border-white/[.07] p-3 transition hover:border-gold/35"><div className="text-[10px] uppercase tracking-wider text-muted">{key}</div><div className="mt-1 truncate text-sm text-chalk">{value}</div></Link>)}</div>
          <div className="mt-5 space-y-2">{matches.map((match)=><Link key={match.id} href={`/portal-record/${match.id}`} className="flex items-center justify-between rounded-xl border border-white/[.07] p-3 text-sm transition hover:border-gold/35"><span className="text-chalk">{match.title}</span><span className="text-gold">Open →</span></Link>)}</div>
        </Card>;
      })}
    </div>
    {!data.buyBoxes.length && <Card className="p-8 text-center text-muted">No buy box is related to this investor in God’s Blueprint.</Card>}
    <Card className="overflow-hidden border-gold/15">
      <div className="border-b border-white/[0.06] p-5">
        <div className="label-mono text-gold">Investor matches</div>
        <h2 className="mt-2 text-xl font-semibold text-chalk">Related active matches</h2>
      </div>
      {data.matches.length ? (
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {data.matches.map((match) => (
            <Link key={match.id} href={`/portal-record/${match.id}`} className="flex items-center justify-between rounded-xl border border-white/[.07] p-4 text-sm transition hover:border-gold/35">
              <div><div className="font-medium text-chalk">{match.title}</div><div className="mt-1 text-xs text-muted">{match.fields.status || match.fields.stage || "Active match"}</div></div>
              <span className="text-gold">Open →</span>
            </Link>
          ))}
        </div>
      ) : <div className="p-6 text-sm text-muted">No active match is related to this investor or their buy boxes.</div>}
    </Card>
  </div>;
}
