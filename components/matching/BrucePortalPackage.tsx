"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import FullUnderwritingPackage from "@/components/matching/FullUnderwritingPackage";
import InvestorNdaAgreement, { INVESTOR_NDA_CHECKBOX, INVESTOR_NDA_VERSION } from "@/components/investors/InvestorNdaAgreement";
import type { BruceScore } from "@/lib/bruceMatchingEngine";
import { isBruceWalkthroughMode } from "@/lib/bruceWalkthrough";
import { canGenerateLoi, canViewUnderwriting, packageRegistryIds, type PortalPackageDataset } from "@/lib/portalPackages";

type RecordRow = { id: string; title: string; fields: Record<string, string> };
type Props = { asset: BruceScore | null; buyBox?: { title: string; priceRange: string; markets: string; strategy: string; sourcePartner: string } | null; session: any; onClose: () => void; onSave: () => void };
type NdaAcceptance = { matchId: string; assetId?: string; investorId?: string; accepted: true; acceptedAt: string; acceptedBy?: string; version: string };

const NDA_VERSION = INVESTOR_NDA_VERSION;
const clean = (value: unknown, fallback = "Not provided") => value === null || value === undefined || value === "" ? fallback : String(value);
const field = (fields: Record<string, string>, aliases: string[]) => Object.entries(fields).find(([key]) => aliases.some((alias) => key.toLowerCase().includes(alias.toLowerCase())))?.[1] || "";
const rows = (items: Array<[string, unknown]>) => <div className="overflow-hidden rounded-2xl border border-white/[.08]"><div className="grid grid-cols-[minmax(140px,.42fr)_1fr] bg-white/[.055] px-4 py-3 text-xs text-gold"><span>Field</span><span>Record Value</span></div>{items.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(140px,.42fr)_1fr] border-t border-white/[.07] px-4 py-3 text-sm"><span className="text-muted">{label}</span><span className="whitespace-pre-wrap break-words text-chalk/80">{clean(value)}</span></div>)}</div>;
const section = (title: string, items: Array<[string, unknown]>) => <section className="space-y-3"><h3 className="label-mono text-gold">{title}</h3>{rows(items)}</section>;
const esc = (value: unknown) => clean(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
const ndaKey = (matchId: string) => `sbf_world_nda_acceptance_${matchId}`;

export default function BrucePortalPackage({ asset, buyBox, session, onClose, onSave }: Props) {
  const walkthrough = isBruceWalkthroughMode(session, asset ? { id: asset.id, title: asset.name } : undefined);
  const [view, setView] = useState<"teaser" | "underwriting" | "loi">("teaser");
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [underwritingLoaded, setUnderwritingLoaded] = useState(false);
  const [pof, setPof] = useState("Pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loi, setLoi] = useState({ offer: walkthrough ? "$4,850,000" : "", deposit: walkthrough ? "1% earnest money" : "", diligence: walkthrough ? "30 days" : "", closing: walkthrough ? "45 days" : "", financing: walkthrough ? "Senior debt + investor equity" : "" });

  useEffect(() => {
    setView("teaser"); setRecords([]); setUnderwritingLoaded(false); setError(""); setNdaChecked(false); setNdaOpen(false);
    if (!asset) return;
    try {
      const saved = JSON.parse(localStorage.getItem(ndaKey(asset.id)) || "null") as NdaAcceptance | null;
      setNdaAccepted(Boolean(saved?.accepted && saved.matchId === asset.id));
    } catch { setNdaAccepted(false); }
  }, [asset?.id]);

  useEffect(() => {
    if (!asset || !session?.email) return;
    void fetch("/api/notion/deal-workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email, user: session, matchId: asset.id, action: "status" }) })
      .then((response) => response.json()).then((payload) => setPof(payload.data?.status || "Pending")).catch(() => {});
  }, [asset?.id, session]);

  const uwFields = useMemo(() => Object.assign({}, ...records.map((record) => record.fields)), [records]);
  const dataset = useMemo<PortalPackageDataset | null>(() => asset ? {
    selectedRecordId: asset.id, packageType: view, generatedAt: new Date().toISOString(),
    asset: { name: asset.name || "Memphis Multifamily Value-Add", registryId: asset.registryId || asset.id, type: asset.assetClass || "Multifamily", pillar: asset.pillar || "Real Estate", locationMarket: asset.market || "Memphis", askingPriceValue: asset.price, revenuePotential: asset.revenuePotential, dealType: asset.dealType || "Value-Add", founderApproval: walkthrough ? "Walkthrough cleared" : "Approved", revealStage: asset.visibility || "Teaser" },
    investor: { name: session?.name || "Bruce Edwards", organization: "Eden Elevations 3", registryName: "Bruce Edwards / Eden Elevations 3", capitalCapacity: buyBox?.priceRange, minCheckLoan: buyBox?.priceRange, maxCheckLoan: buyBox?.priceRange, ndaStatus: ndaAccepted ? "Signed / Accepted in portal" : "Required", proofOfFundsStatus: walkthrough ? "Walkthrough cleared" : pof },
    partnerSubmission: { sourcePartner: buyBox?.sourcePartner || asset.partner, submissionStatus: "Approved match", documentsReceived: [asset.hasT12 ? "T-12" : "", asset.hasRentRoll ? "Rent Roll" : ""].filter(Boolean), dataCompleteness: walkthrough ? "Demo-ready" : asset.hasT12 && asset.hasRentRoll ? "Complete" : "In progress", noiIncome: asset.noi, capRateYield: asset.capRate },
    underwriting: { records, noiT12: field(uwFields, ["noi t12", "t-12 noi", "noi"]), noiT3: field(uwFields, ["noi t3", "t-3 noi"]), rentRoll: field(uwFields, ["rent roll"]), expenses: field(uwFields, ["expenses", "expense schedule"]), capRate: field(uwFields, ["cap rate", "yield"]) || asset.capRate, valuationMethod: field(uwFields, ["valuation method"]), valuationOutput: field(uwFields, ["valuation output", "valuation"]), dscr: field(uwFields, ["dscr"]), equityRequired: field(uwFields, ["equity required", "equity"]), debtRequired: field(uwFields, ["debt required", "debt"]), targetLtvLtc: field(uwFields, ["ltv", "ltc"]), loanAmount: field(uwFields, ["loan amount"]), rateTerms: field(uwFields, ["rate", "terms"]), packageReadyStatus: walkthrough ? "Ready" : /complete|ready/i.test(asset.underwritingStatus) ? "Ready" : "Pending", dataCompleteness: walkthrough ? "Demo-ready" : asset.hasT12 && asset.hasRentRoll ? "Complete" : "In progress" },
    buyBoxMatch: { investorFit: asset.strengths.join("; "), capitalFit: `${buyBox?.priceRange || "Mandate range pending"} versus ${asset.price || "asset price pending"}`, dealFit: asset.matchCriteria || asset.strengths.join("; "), geographyFit: asset.geographyMatch || asset.market, nextStep: asset.nextAction, criteria: buyBox as any },
    loi: { proposedOfferAmount: loi.offer, deposit: loi.deposit, dueDiligencePeriod: loi.diligence, closingTimeline: loi.closing, financing: loi.financing }, registryIds: packageRegistryIds(asset.registryId || asset.id, "BRUCE"),
  } : null, [asset, buyBox, view, ndaAccepted, pof, records, uwFields, loi, session?.name, walkthrough]);

  if (!asset || !dataset) return null;

  const reveal = async (acceptedNow = false) => {
    if (!ndaAccepted && !acceptedNow) { setNdaOpen(true); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/notion/deal-workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email, user: session, matchId: asset.id, matchTitle: asset.name, consent: true }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load the underwriting package.");
      setRecords(Array.isArray(payload.data?.underwriting) ? payload.data.underwriting : []); setUnderwritingLoaded(true); setView("underwriting");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load the underwriting package."); }
    finally { setBusy(false); }
  };

  const openView = (next: typeof view) => {
    if (next === "underwriting") { setView(next); if (!ndaAccepted) setNdaOpen(true); else if (!underwritingLoaded) void reveal(); return; }
    if (next === "loi" && !ndaAccepted) { setNdaOpen(true); return; }
    setView(next);
  };

  const acceptNda = () => {
    const acceptance: NdaAcceptance = { matchId: asset.id, assetId: asset.registryId || asset.id, investorId: session?.id || session?.contactId, accepted: true, acceptedAt: new Date().toISOString(), acceptedBy: session?.name || "Bruce Edwards", version: NDA_VERSION };
    try { localStorage.setItem(ndaKey(asset.id), JSON.stringify(acceptance)); } catch { /* session state still permits the walkthrough */ }
    setNdaAccepted(true); setNdaOpen(false); setNdaChecked(false);
    void reveal(true);
  };

  const download = (type: typeof view) => {
    if (type === "underwriting" && !ndaAccepted) { setNdaOpen(true); return; }
    const blocks: Array<[string, unknown]> = type === "underwriting" ? [["Asset Name", dataset.asset.name], ["Registry ID", dataset.registryIds.underwriting], ["Asset Type", dataset.asset.type], ["Location / Market", dataset.asset.locationMarket], ["Asking Price / Value", dataset.asset.askingPriceValue], ["NOI T-12", dataset.underwriting.noiT12], ["NOI T-3", dataset.underwriting.noiT3], ["Rent Roll", dataset.underwriting.rentRoll], ["Expenses", dataset.underwriting.expenses], ["Cap Rate", dataset.underwriting.capRate], ["Valuation", dataset.underwriting.valuationOutput], ["DSCR", dataset.underwriting.dscr], ["Equity Required", dataset.underwriting.equityRequired], ["Debt Required", dataset.underwriting.debtRequired], ["Loan Amount", dataset.underwriting.loanAmount], ["Rate / Terms", dataset.underwriting.rateTerms], ["NDA", dataset.investor.ndaStatus]] : type === "loi" ? [["Investor", dataset.investor.name], ["Organization", dataset.investor.organization], ["Asset", dataset.asset.name], ["Proposed Offer", loi.offer], ["Deposit", loi.deposit], ["Due Diligence", loi.diligence], ["Closing", loi.closing], ["Financing", loi.financing]] : [["Asset Name", dataset.asset.name], ["Registry ID", dataset.registryIds.teaser], ["Market", dataset.asset.locationMarket], ["Deal Type", dataset.asset.dealType], ["Investor Fit", dataset.buyBoxMatch.investorFit], ["Indicative Price", dataset.asset.askingPriceValue]];
    const registry = dataset.registryIds[type]; const table = blocks.map(([key, value]) => `<tr><td>${esc(key)}</td><td>${esc(value)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;max-width:1000px;margin:40px auto;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:10px;text-align:left}th{background:#eee}</style></head><body><h1>SBF WORLD — ${type === "loi" ? "Letter of Intent" : type === "underwriting" ? "Full Underwriting Package" : "Investor Match Teaser"}</h1><p><b>Registry ID:</b> ${esc(registry)}</p><table><tr><th>Field</th><th>Record Value</th></tr>${table}</table><p>Confidential · SBF WORLD document control applies.</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" })); const link = document.createElement("a"); link.href = url; link.download = `${registry}.html`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <>
    <Modal open onClose={onClose} title={asset.name || "Memphis Multifamily Value-Add"} sub={`${asset.score || 92}% match · Bruce Edwards / Eden Elevations 3`} width="max-w-5xl">
      <div className="space-y-5">
        {walkthrough && <div className="rounded-xl border border-gold/25 bg-gold/[.08] px-4 py-3 text-xs text-gold">Walkthrough Mode: Bruce portal demo — approvals bypassed for live guided review.</div>}
        <div className="flex flex-wrap gap-2">{(["teaser", "underwriting", "loi"] as const).map((tab) => <button key={tab} onClick={() => openView(tab)} className={`rounded-full border px-4 py-2 text-xs capitalize ${view === tab ? "border-gold/50 bg-gold/15 text-gold" : "border-white/[.1] text-muted"}`}>{tab === "loi" ? "Letter of Intent" : tab === "underwriting" ? "Full Underwriting" : "Teaser"}</button>)}</div>
        <div className="rounded-2xl border border-gold/20 bg-gold/[.055] p-5"><div className="label-mono text-gold">SBF WORLD · STOGIES · BIRDIES · FLIGHTS</div><h2 className="mt-2 text-2xl font-semibold text-chalk">{view === "teaser" ? "Investor Match Teaser" : view === "underwriting" ? "Full Underwriting Package" : "Letter of Intent"}</h2><div className="mt-2 text-xs text-muted">{dataset.registryIds[view]}</div></div>

        {view === "teaser" && <div className="space-y-5">{section("Portal Header", [["Asset Name", dataset.asset.name], ["Asset Registry ID", dataset.asset.registryId], ["Match Score", `${asset.score || 92}%`], ["Pillar", dataset.asset.pillar], ["Location / Market", dataset.asset.locationMarket], ["Deal Type", dataset.asset.dealType]])}{section("Match Summary", [["Investor Fit", dataset.buyBoxMatch.investorFit], ["Capital Fit", dataset.buyBoxMatch.capitalFit], ["Deal Fit", dataset.buyBoxMatch.dealFit], ["Geography Fit", dataset.buyBoxMatch.geographyFit], ["Next Step", dataset.buyBoxMatch.nextStep]])}{section("Financial Preview", [["Indicative Price", dataset.asset.askingPriceValue], ["Revenue Potential", dataset.asset.revenuePotential], ["Cap Rate / Yield", dataset.partnerSubmission.capRateYield || "Available after NDA acceptance"], ["NOI / Income", dataset.partnerSubmission.noiIncome || "Available after NDA acceptance"]])}<div className="flex flex-wrap gap-2"><Button onClick={() => openView("underwriting")}>Open Full Underwriting</Button><Button variant="outline" onClick={() => download("teaser")}>Download Teaser</Button>{!walkthrough && <Button variant="ghost" onClick={onSave}>Save Match</Button>}</div></div>}

        {view === "underwriting" && <div className="space-y-5">{busy && <div className="rounded-xl border border-gold/20 bg-gold/[.06] p-4 text-sm text-gold">Loading 07 — Underwriting Engine — CORE…</div>}{error && <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}{underwritingLoaded && <><FullUnderwritingPackage records={records} registryId={dataset.registryIds.underwriting} generatedAt={dataset.generatedAt} /><div className="flex flex-wrap gap-2"><Button disabled={!canViewUnderwriting(dataset, { walkthrough })} onClick={() => download("underwriting")}>Download Secure Package</Button><Button variant="outline" onClick={() => openView("loi")}>Continue to LOI</Button>{!walkthrough && <Button variant="ghost" onClick={onSave}>Save to Deal Room</Button>}</div></>}</div>}

        {view === "loi" && <div className="space-y-5">{section("Access Confirmation", [["NDA", dataset.investor.ndaStatus], ["Proof of Funds", walkthrough ? "Walkthrough cleared" : dataset.investor.proofOfFundsStatus], ["Founder Approval", walkthrough ? "Walkthrough cleared" : dataset.asset.founderApproval]])}{!canGenerateLoi(dataset, { walkthrough }) && <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">LOI generation remains subject to the normal production approval gates.</div>}{section("Parties & Asset", [["Investor", dataset.investor.name], ["Organization", dataset.investor.organization], ["Asset", dataset.asset.name], ["Location / Market", dataset.asset.locationMarket], ["Asking Price / Value", dataset.asset.askingPriceValue]])}<div className="grid gap-3 sm:grid-cols-2">{Object.entries({ offer: "Proposed Offer Amount", deposit: "Deposit", diligence: "Due Diligence Period", closing: "Closing Timeline", financing: "Financing" }).map(([key, label]) => <label key={key} className="text-xs text-muted">{label}<input value={(loi as any)[key]} onChange={(event) => setLoi((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-chalk outline-none focus:border-gold/50" /></label>)}</div><div className="rounded-2xl border border-gold/15 bg-gold/[.04] p-5 text-sm leading-6 text-chalk/75">This non-binding Letter of Intent is based on preliminary review through the SBF WORLD portal. Final terms remain subject to diligence, documentation, and mutually acceptable definitive agreements.</div><div className="flex flex-wrap gap-2"><Button disabled={!canGenerateLoi(dataset, { walkthrough })} onClick={() => download("loi")}>Generate / View LOI</Button><Button variant="ghost" onClick={() => openView("teaser")}>Back to Teaser</Button></div></div>}
        <p className="border-t border-white/[.07] pt-4 text-xs leading-5 text-muted">Preliminary and confidential review only. All materials remain subject to SBF WORLD document control.</p>
      </div>
    </Modal>

    <Modal open={ndaOpen} onClose={() => { setNdaOpen(false); setNdaChecked(false); setView("teaser"); }} title="SBF WORLD Investor Portal Master Non Disclosure & Non Circumvention Agreement" sub={`${NDA_VERSION} · Confidential investor access`} width="max-w-3xl">
      <div className="space-y-5"><div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-white/[.08] bg-black/25 p-5"><InvestorNdaAgreement /></div><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/20 bg-gold/[.05] p-4 text-sm text-chalk/85"><input type="checkbox" checked={ndaChecked} onChange={(event) => setNdaChecked(event.target.checked)} className="mt-1 accent-[#C8A24A]" /><span>{INVESTOR_NDA_CHECKBOX}</span></label><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => { setNdaOpen(false); setNdaChecked(false); setView("teaser"); }}>Cancel</Button><Button disabled={!ndaChecked} onClick={acceptNda}>I Agree — Continue to Portal</Button></div></div>
    </Modal>
  </>;
}
