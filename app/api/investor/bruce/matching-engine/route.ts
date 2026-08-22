import { NextResponse } from "next/server";
import { getCorePortalBundle, CorePortalError } from "@/lib/corePortal";
import { PortalAccessError, requirePortalSession } from "@/lib/portalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const cleanId = (value = "") => value.replaceAll("-", "").toLowerCase();
const field = (fields: Record<string, string>, names: string[]) => {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  const aliases = names.map(normalize);
  const entries = Object.entries(fields);
  return (entries.find(([key]) => aliases.includes(normalize(key))) ||
    entries.find(([key]) => aliases.some((name) => normalize(key).includes(name))))?.[1] || "";
};
const scorePercent = (value = "") => {
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const number = Number(match[0]);
  if (!Number.isFinite(number)) return 0;
  // Notion may return either a decimal ratio (0.935) or an already formatted
  // percentage (93.5%). Preserve its precision instead of rounding it.
  return number > 0 && number <= 1 ? number * 100 : number;
};
const relationIds = (value = "") => value.split(",").map(cleanId).filter(Boolean);

export async function POST(request: Request) {
  try {
    const identity = requirePortalSession(request);
    const body = await request.json().catch(() => ({})) as { buyBoxId?: string };
    const bundle = await getCorePortalBundle(identity);
    const buyBoxes = bundle.sections.find((section) => section.key === "buy-box-signals")?.rows || [];
    const allMatches = bundle.sections.find((section) => section.key === "active-matches")?.rows || [];
    const selected = buyBoxes.find((row) => cleanId(row.id) === cleanId(body.buyBoxId || "")) || buyBoxes[0] || null;
    // Bruce's canonical Investor Portal defines one ranked recommendation list
    // across both of his mandates, so do not hide a curated item merely because
    // its underlying DB 08 signal relation belongs to the other mandate lane.
    // Compare only canonical DB 08 rows related to the selected buy box. The
    // stored Match Score is displayed; the wider Assets database is not scored.
    // Bruce's Live — Bruce Matches view contains the four approved/visible DB 08
    // records. Either buy box provides context without rescoring the asset pool.
    const matches = allMatches;
    const candidates = matches.map((row) => ({
      id: row.id,
      name: row.title,
      market: field(row.fields, ["Teaser Location", "Location", "Market"]),
      state: "",
      assetClass: field(row.fields, ["Teaser Asset Type", "Teaser Asset Class", "Asset Type"]),
      price: Number(field(row.fields, ["Teaser Price", "Price"])) || null,
      units: Number(field(row.fields, ["Teaser Unit Count", "Unit Count"])) || null,
      yearBuilt: Number(field(row.fields, ["Teaser Year Built", "Year Built"])) || null,
      valueAddTriggers: [field(row.fields, ["Teaser Strategy", "Match Reason"])].filter(Boolean),
      neighborhoodGrade: "",
      safetyPass: null,
      hasT12: /full underwriting complete/i.test(field(row.fields, ["Financial Readiness"])),
      hasRentRoll: /full underwriting complete/i.test(field(row.fields, ["Financial Readiness"])),
      noi: null,
      underwritingStatus: field(row.fields, ["Financial Readiness", "Full Underwriting Status"]),
      visibility: field(row.fields, ["Reveal Stage"]),
      partner: "Brad Gaubert",
      updated: field(row.fields, ["Created"]),
      registryId: field(row.fields, ["Registry ID", "Asset Registry ID"]) || row.id,
      pillar: field(row.fields, ["Pillar", "Asset Pillar"]) || "Real Estate",
      dealType: field(row.fields, ["Deal Type", "Transaction Type", "Teaser Deal Type"]),
      revenuePotential: field(row.fields, ["Revenue Potential", "Projected Revenue", "Revenue"]),
      capRate: field(row.fields, ["Cap Rate", "Yield", "Teaser Cap Rate"]),
      matchCriteria: field(row.fields, ["Match Reason", "Buy Box Match Criteria"]),
      geographyMatch: field(row.fields, ["Geography Match", "Location Match"]),
      teaserSummary: field(row.fields, ["Teaser Summary", "Summary", "Match Reason"]),
      score: scorePercent(field(row.fields, ["Match Score"])),
      label: field(row.fields, ["Match Tier"]) || "Strong Match",
      strengths: [field(row.fields, ["Match Reason"])].filter(Boolean),
      blockers: [field(row.fields, ["Match Gaps"])].filter(Boolean),
      nextAction: field(row.fields, ["Next Action"]),
      blocked: false,
    }));
    return NextResponse.json({ success: true, data: {
      investor: "Bruce Edwards",
      entity: "Eden Elevations 3",
      source: "God's Blueprint — CORE (Canonical) / Live — Bruce Matches",
      buyBoxes: buyBoxes.map((row) => ({ id: row.id, title: row.title, status: field(row.fields, ["Status"]), investor: "Bruce Edwards", entity: "Eden Elevations 3", assetClass: field(row.fields, ["Asset Types Wanted"]), markets: field(row.fields, ["Geography"]), priceRange: `${field(row.fields, ["Budget Min"])} – ${field(row.fields, ["Budget Max"])}`, units: field(row.fields, ["Notes"]), strategy: field(row.fields, ["Buy Box Type"]), risk: "Not provided", returns: "Not provided", holdPeriod: "Not provided", requiredDocuments: "Not provided", notes: field(row.fields, ["Notes"]), sourcePartner: "Brad Gaubert", updated: field(row.fields, ["Created"]) })),
      selectedBuyBox: selected ? { id: selected.id, title: selected.title } : null,
      candidates,
      counts: { canonicalMatches: allMatches.length, buyBoxes: buyBoxes.length, candidates: candidates.length, strongGood: candidates.length, blocked: 0 },
      generatedAt: new Date().toISOString(),
    } });
  } catch (error) {
    const status = error instanceof PortalAccessError || error instanceof CorePortalError ? error.status : 502;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Matching engine unavailable." }, { status });
  }
}
