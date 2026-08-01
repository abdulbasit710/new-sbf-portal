"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";
import type { BlueprintPageContent, NotionContentBlock } from "@/lib/notionService";
import { compactBruceValue, useBruceVisibleMatches } from "@/components/matching/BruceVisibleMatches";
import BruceMatchingEngine from "@/components/matching/BruceMatchingEngine";

type BlueprintBlock = NotionContentBlock & { databaseRows?: Array<Record<string, string>> };
type DealRow = { id: string; fields: Record<string, string>; source: string };

const INVESTOR_SOURCE_KEYS = new Set([
  "investors-buyers-lenders",
  "assets",
  "buy-boxes-mandates",
  "underwriting-engine",
  "matching-engine",
  "vault-controlled-reveal",
  "deals-closing",
  "documents-governance",
  "investor-buyer-portal-template",
]);

const norm = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const field = (fields: Record<string, string>, names: string[]) => {
  const entries = Object.entries(fields);
  for (const name of names) {
    const exact = entries.find(([key]) => norm(key) === norm(name));
    if (exact?.[1]) return exact[1];
  }
  return entries.find(([key]) => names.some((name) => norm(key).includes(norm(name))))?.[1] || "";
};
const yes = (value = "") => /signed|verified|approved|confirmed|complete|active|yes/i.test(value) && !/not|unverified|pending|declined|expired/i.test(value);
const display = (value = "") => value.trim() || "Not provided";
const safeTitle = (row: DealRow) => display(field(row.fields, ["coded name", "asset name", "opportunity name", "deal name", "title", "name"]));

function StatusPill({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/25 px-3 py-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${good ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]" : "bg-amber-300"}`} />
      <span className="text-muted">{label}</span>
      <span className="font-medium text-chalk">{display(value)}</span>
    </div>
  );
}

function Metric({ label, value, helper, icon }: { label: string; value: string | number; helper: string; icon: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.055] to-black/20 p-5 transition hover:border-gold/30">
      <div className="flex items-start justify-between"><span className="label-mono text-muted">{label}</span><span className="rounded-xl border border-gold/20 bg-gold/10 p-2 text-gold">{icon}</span></div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-chalk">{value}</div>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

export default function InvestorDashboard() {
  const { session } = useSession();
  const { matches: visibleMatches, visibleValue, loading: matchesLoading } = useBruceVisibleMatches();
  const [pages, setPages] = useState<BlueprintPageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ndaOpen, setNdaOpen] = useState(false);
  const [ndaConsent, setNdaConsent] = useState(false);
  const [signedLocally, setSignedLocally] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealRow | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [engineBuyBoxCount, setEngineBuyBoxCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.email) {
        setLoading(false);
        return;
      }
      try {
        setError("");
        setLoading(true);
        const response = await fetch("/api/notion/investor-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session?.email, name: session?.name, contactId: session?.contactId }),
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load investor records.");
        if (!cancelled) setPages((payload.data?.pages || []).filter((page: BlueprintPageContent) => INVESTOR_SOURCE_KEYS.has(page.key)));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load investor records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [session?.contactId, session?.email, session?.name]);

  const rowsByKey = useMemo(() => {
    const out = new Map<string, DealRow[]>();
    pages.forEach((page) => {
      const rows = page.blocks.flatMap((block) => ((block as BlueprintBlock).databaseRows || []).map((fields, index) => ({ id: `${page.key}-${block.id}-${index}`, fields, source: page.title })));
      out.set(page.key, rows);
    });
    return out;
  }, [pages]);

  const identityTokens = useMemo(() => [session?.email, session?.contactId, session?.name].filter(Boolean).map((v) => norm(v)), [session]);
  const belongsToInvestor = (row: DealRow) => {
    const values = norm(Object.values(row.fields).join(" "));
    return identityTokens.some((token) => token.length > 3 && values.includes(token));
  };
  const investorRows = rowsByKey.get("investors-buyers-lenders") || [];
  const profile = investorRows.find(belongsToInvestor)?.fields || {};
  const buyBoxes = (rowsByKey.get("buy-boxes-mandates") || []).filter(belongsToInvestor);
  const activeBuyBoxes = buyBoxes.filter((row) => {
    const status = field(row.fields, ["buy box status", "mandate status", "status"]);
    return !status || /active|approved|submitted|live|ready|current/i.test(status);
  });
  const authoritativeBuyBoxCount = engineBuyBoxCount ?? (loading ? null : activeBuyBoxes.length);
  const hasActiveBuyBoxes = Boolean(authoritativeBuyBoxCount && authoritativeBuyBoxCount > 0);
  const lockRows = (rowsByKey.get("deals-closing") || []).filter((row) => belongsToInvestor(row) && /lock|reserve/i.test(Object.values(row.fields).join(" ")));
  const documentRows = (rowsByKey.get("documents-governance") || []).filter(belongsToInvestor);

  const ndaValue = signedLocally ? "Signed" : field(profile, ["nda status", "nda"] ) || session?.ndaStatus || "Not started";
  const pofValue = field(profile, ["proof of funds status", "proof of funds", "pof status", "pof"]) || "Not uploaded";
  const authorityValue = field(profile, ["buyer authority status", "buyer authority", "authorized buyer"]) || "Not confirmed";
  const ndaSigned = yes(ndaValue);
  const pofReady = yes(pofValue);
  const authorityReady = yes(authorityValue);
  const nextStep = !ndaSigned ? { title: "Sign your NDA", text: "Unlock underwriting summaries and confidential deal materials.", action: "Review & Sign NDA", run: () => setNdaOpen(true) }
    : !hasActiveBuyBoxes ? { title: "Submit your buy box", text: "Tell SBF WORLD your markets, asset classes, size and return targets.", action: "Open Buy Box", run: () => { window.location.href = "/buy-box"; } }
    : !pofReady ? { title: "Upload proof of funds", text: "Complete qualification for restricted seller-facing opportunities.", action: "Upload POF", run: () => { window.location.href = "/documents"; } }
    : { title: "Run your active buy boxes", text: "Match each Bruce mandate against the total permitted asset pool.", action: "Open Matching Engine", run: () => document.getElementById("investor-buy-boxes")?.scrollIntoView({ behavior: "smooth" }) };

  const signNda = () => {
    if (!ndaConsent) return;
    const stamp = new Date().toISOString();
    setSignedLocally(true);
    setNdaOpen(false);
    try { localStorage.setItem(`sbf-nda-${session?.email || "investor"}`, JSON.stringify({ status: "Signed", signedAt: stamp, version: "SBF-NDA-2026.1", signedBy: session?.name, entity: field(profile, ["company", "entity", "fund"]) })); } catch { /* browser storage may be disabled */ }
  };

  useEffect(() => {
    try { setSignedLocally(Boolean(localStorage.getItem(`sbf-nda-${session?.email || "investor"}`))); } catch { /* ignore */ }
  }, [session?.email]);

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-gold/20 bg-[radial-gradient(circle_at_85%_0%,rgba(212,175,55,.17),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,.065),rgba(0,0,0,.3))] p-6 shadow-panel sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="label-mono text-gold">Private Investor Portal · God&apos;s Blueprint</div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-chalk sm:text-5xl">Welcome back, {session?.name?.split(" ")[0] || "Investor"}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-chalk/60">Your qualification, curated opportunities, diligence access, and next actions in one controlled workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label="NDA" value={ndaValue} good={ndaSigned} />
            <StatusPill label="POF" value={pofValue} good={pofReady} />
            <StatusPill label="Authority" value={authorityValue} good={authorityReady} />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">Live Blueprint data is temporarily unavailable. No alternate workspace or sample deal data has been substituted. {error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Capital capacity" value={display(field(profile, ["capital capacity", "available capital", "capital available"]))} helper="Verified investor profile" icon={Icon.bank(18)} />
        <Metric label="Active matches" value={matchesLoading ? "…" : visibleMatches.length} helper="Approved Bruce-visible teasers" icon={Icon.pulse(18)} />
        <Metric label="Visible value" value={matchesLoading ? "…" : compactBruceValue(visibleValue)} helper="Same total as Active Matches" icon={Icon.bank(18)} />
        <Metric label="Interested assets" value={visibleMatches.filter((row) => /interested|under review|more info/i.test(row.status)).length} helper="Your current pipeline" icon={Icon.trend(18)} />
        <Metric label="Reserved assets" value={lockRows.length} helper="Requested or approved" icon={Icon.shield(18)} />
        <Metric label="Active buy boxes" value={authoritativeBuyBoxCount ?? "…"} helper="Same live source as Matching Engine" icon={Icon.trend(18)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.11] to-transparent p-6 sm:p-7">
          <div className="flex items-center gap-2 text-gold">{Icon.pulse(18)}<span className="label-mono">Action required</span></div>
          <h2 className="mt-4 text-2xl font-semibold text-chalk">{nextStep.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-chalk/65">{nextStep.text}</p>
          <Button className="mt-6" onClick={nextStep.run}>{nextStep.action} <span aria-hidden>→</span></Button>
        </div>
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="label-mono text-muted">Qualification progress</div>
          <div className="mt-5 space-y-4">
            {[["NDA signed", ndaSigned], ["Buy box submitted", hasActiveBuyBoxes], ["Proof of funds", pofReady], ["Buyer authority", authorityReady]].map(([label, done]) => (
              <div key={String(label)} className="flex items-center justify-between text-sm"><span className="text-chalk/75">{label}</span><span className={done ? "text-emerald-300" : "text-muted"}>{done ? "Complete" : "Required"}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="investor-buy-boxes">
        <div className="mb-5">
          <div className="label-mono text-gold">My Buy Boxes · Matching Engine</div>
          <h2 className="mt-2 text-2xl font-semibold text-chalk">Run each mandate against the total asset pool</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Only Bruce Edwards and Eden Elevations 3 buy boxes appear here. Choose a mandate, run matching, and review its strongest opportunities without leaving the Investor Dashboard.</p>
        </div>
        <BruceMatchingEngine embedded onBuyBoxesLoaded={setEngineBuyBoxCount} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {[{ title: "Document room", value: `${documentRows.length} available`, text: "NDA, POF, entity files and approved diligence materials.", href: "/documents", action: "Open documents", icon: Icon.doc(20) }, { title: "Underwriting room", value: ndaSigned ? "Access evaluated" : "NDA gated", text: "Financial analysis, risk review and approved recommendations.", href: "/underwriting", action: "View underwriting", icon: Icon.shield(20) }].map((item) => <div key={item.title} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6"><div className="flex items-center justify-between"><span className="text-gold">{item.icon}</span><span className="text-xs text-muted">{item.value}</span></div><h3 className="mt-5 text-lg font-medium text-chalk">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.text}</p><button onClick={() => { window.location.href = item.href; }} className="mt-5 text-sm text-gold transition hover:text-gold-soft">{item.action} →</button></div>)}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-[11px] text-muted"><span>Source: God&apos;s Blueprint · Investor allowlist only · No cross-team fallback</span><span>{loading ? "Synchronizing…" : `Last checked ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</span></div>

      <Modal open={ndaOpen} onClose={() => setNdaOpen(false)} title="SBF WORLD Non-Disclosure Agreement" sub="Version SBF-NDA-2026.1 · Confidential investor access" width="max-w-3xl">
        <div className="space-y-5 text-sm leading-6 text-chalk/70"><div className="rounded-2xl border border-gold/15 bg-gold/[0.05] p-4"><div className="label-mono text-gold">Plain-English summary</div><p className="mt-2">Deal information, seller details, financials, underwriting and diligence materials are confidential and may not be copied or distributed without written approval.</p></div><div className="grid gap-3 sm:grid-cols-2"><div><span className="text-muted">Signing investor</span><div className="text-chalk">{session?.name || "Investor"}</div></div><div><span className="text-muted">Entity</span><div className="text-chalk">{display(field(profile, ["company", "entity", "fund", "organization"]))}</div></div></div><div className="max-h-52 overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/25 p-5"><h3 className="font-medium text-chalk">Non-Disclosure Agreement</h3><p className="mt-3">The receiving party agrees to protect all confidential opportunity information disclosed through the SBF WORLD portal, use it solely to evaluate a potential transaction, and restrict access to authorized professional advisers who are bound by equivalent confidentiality duties. Confidential information includes asset identity, seller and broker information, financial statements, models, underwriting, documents, pricing, strategy, and communications.</p><p className="mt-3">Access does not grant ownership, exclusivity, or authority to distribute materials. SBF WORLD may revoke access when qualification, authority, or compliance requirements are not maintained.</p></div><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] p-4"><input type="checkbox" checked={ndaConsent} onChange={(e) => setNdaConsent(e.target.checked)} className="mt-1 accent-[#C8A24A]" /><span>I confirm that I have read and agree to the SBF WORLD Non-Disclosure Agreement and will not share, copy, or distribute confidential materials without written approval.</span></label><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setNdaOpen(false)}>Cancel</Button><Button disabled={!ndaConsent} onClick={signNda}>Agree, Sign & Continue</Button></div><p className="text-xs text-muted">Signing records your name, entity, timestamp, consent and agreement version in this browser. Production deployment should persist this event to the NDA consent database.</p></div>
      </Modal>

      <Modal open={Boolean(selectedDeal) && !requestOpen} onClose={() => setSelectedDeal(null)} title={selectedDeal ? safeTitle(selectedDeal) : "Deal review"} sub="Controlled investor access">
        {selectedDeal && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{[["Market", field(selectedDeal.fields, ["market", "location"])], ["Asset type", field(selectedDeal.fields, ["asset type", "asset class"])], ["Match score", field(selectedDeal.fields, ["match score", "score"])], ["Underwriting", field(selectedDeal.fields, ["underwriting status", "underwriting"])]].map(([label,value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="text-xs text-muted">{label}</div><div className="mt-1 text-sm text-chalk">{display(value)}</div></div>)}</div>{!ndaSigned && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">Sensitive financials and documents are locked until the NDA is signed.</div>}<div className="flex flex-wrap gap-2"><Button onClick={() => ndaSigned ? setRequestOpen(true) : setNdaOpen(true)}>{ndaSigned ? "Request More Information" : "Review & Sign NDA"}</Button><Button variant="outline" disabled={!ndaSigned || !pofReady || !authorityReady}>Request Asset Lock</Button></div>{ndaSigned && (!pofReady || !authorityReady) && <p className="text-xs text-muted">Asset lock requires signed NDA, verified proof of funds, and confirmed buyer authority.</p>}</div>}
      </Modal>

      <Modal open={requestOpen} onClose={() => { setRequestOpen(false); setSelectedDeal(null); }} title="Request More Information" sub={selectedDeal ? safeTitle(selectedDeal) : undefined}>
        <div className="space-y-5"><p className="text-sm text-chalk/65">Select the material you need. This request remains tied to your investor profile and this asset.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["Rent roll", "T12", "Offering memorandum", "Photos", "Debt quote", "Market comps", "Inspection reports", "Financial model", "Legal / title"].map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-white/[0.08] p-3 text-xs text-chalk/75"><input type="checkbox" className="accent-[#C8A24A]" />{item}</label>)}</div><textarea placeholder="Add a question or context…" className="min-h-28 w-full rounded-xl border border-white/[0.09] bg-black/30 p-4 text-sm text-chalk outline-none placeholder:text-muted focus:border-gold/40" /><div className="flex justify-end"><Button onClick={() => { setRequestOpen(false); setSelectedDeal(null); }}>Submit Request</Button></div><p className="text-xs text-muted">The live submission action should be connected to Investor Requests — CORE before production launch.</p></div>
      </Modal>
    </div>
  );
}
