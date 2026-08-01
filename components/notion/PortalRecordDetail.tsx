"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { useSession } from "@/lib/session";
import type { DynamicPortalPage } from "@/lib/notionService";

const strip = (value = "") => value.replace(/-/g, "").toLowerCase();
const hrefForValue = (value: string) => /^https?:\/\//i.test(value) ? value : /^\S+@\S+\.\S+$/.test(value) ? `mailto:${value}` : "";

export default function PortalRecordDetail({ recordId, focusedField }: { recordId: string; focusedField?: string }) {
  const { session } = useSession();
  const [portal, setPortal] = useState<DynamicPortalPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session?.email) return;
    void fetch("/api/notion/portal/current", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email }), cache: "no-store" })
      .then(async (response) => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error); setPortal(payload.data); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load this record."));
  }, [session?.email]);
  const found = useMemo(() => portal?.sections.flatMap((section) => section.rows.map((row) => ({ row, section }))).find(({ row }) => strip(row.id) === strip(recordId)), [portal, recordId]);

  if (error) return <Card className="border-red-400/25 p-6 text-red-200">{error}</Card>;
  if (!portal) return <Card className="p-8 text-center text-muted">Loading God’s Blueprint…</Card>;
  if (!found) return <Card className="p-8 text-center text-muted">This record is not available in Brad’s God’s Blueprint scope.</Card>;
  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-gold/20 bg-gold/[0.055] p-6">
      <Link href="/dashboard" className="text-sm text-gold">← Back to Brad portal</Link>
      <div className="label-mono mt-5 text-gold">{found.section.title}</div><h1 className="mt-2 text-3xl font-semibold text-chalk">{found.row.title}</h1>
      <p className="mt-2 text-sm text-muted">Complete Brad-visible record fetched only from God’s Blueprint.</p>
    </section>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Object.entries(found.row.fields).filter(([,value])=>value).map(([key,value]) => {
      const external = hrefForValue(value); const active = focusedField === key;
      const body = <><div className="text-[11px] uppercase tracking-wider text-muted">{key}</div><div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-chalk">{value}</div></>;
      return external ? <a key={key} href={external} target={external.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`rounded-2xl border p-4 transition hover:border-gold/45 ${active ? "border-gold bg-gold/[.08]" : "border-white/[.07] bg-white/[.025]"}`}>{body}<div className="mt-3 text-xs text-gold">Open field →</div></a> : <div id={`field-${encodeURIComponent(key)}`} key={key} className={`rounded-2xl border p-4 ${active ? "border-gold bg-gold/[.08]" : "border-white/[.07] bg-white/[.025]"}`}>{body}</div>;
    })}</div>
  </div>;
}
