import { NextResponse } from "next/server";
import { getDynamicPortalForEmail, type DynamicPortalPage } from "@/lib/notionService";
import { scoreAssetForBruce, teaserCandidate, type BruceScore } from "@/lib/bruceMatchingEngine";
import { isCompleteNewBuildAsset } from "@/lib/assetCompleteness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

type Row = { id: string; fields: Record<string, string>; source: string };
const clean = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pick = (fields: Record<string, string>, names: string[]) => {
  const entries = Object.entries(fields);
  for (const name of names) { const exact = entries.find(([key]) => clean(key) === clean(name)); if (exact?.[1]) return exact[1]; }
  return entries.find(([key]) => names.some((name) => clean(key).includes(clean(name))))?.[1] || "";
};
const numeric = (value = "") => { const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/); if (!match) return null; let n = Number(match[1]); if (/\b(b|bn|billion)\b/i.test(value)) n *= 1e9; else if (/\b(m|mm|million)\b/i.test(value)) n *= 1e6; else if (/\b(k|thousand)\b/i.test(value)) n *= 1e3; return n; };
const rowsFromSections = (portals: DynamicPortalPage[], keys: string[]): Row[] => portals.flatMap(portal => portal.sections.filter(section => keys.includes(section.key)).flatMap(section => section.rows.map(row => ({ id: row.id, fields: row.fields, source: row.sourceTitle || section.title }))));
const uniqueRows = (rows: Row[]) => {
  const map = new Map<string, Row>();
  rows.forEach(row => {
    const stableId = row.id.replace(/-/g, "").toLowerCase();
    const title = pick(row.fields, ["asset name","buy box name","mandate name","title","name","buy box","match name"]);
    const market = pick(row.fields, ["market","location","geography"]);
    const key = stableId || clean(`${title}|${market}`);
    const current = map.get(key);
    if (!current || Object.values(row.fields).filter(Boolean).length > Object.values(current.fields).filter(Boolean).length) map.set(key,row);
  });
  return Array.from(map.values());
};

const mapBuyBox = (row: Row) => ({
  id: row.id,
  title: pick(row.fields, ["buy box name","mandate name","title","name","buy box"]) || "Untitled buy box",
  status: pick(row.fields, ["status","buy box status","mandate status"]) || "Not provided",
  investor: pick(row.fields, ["investor","buyer","investor name","owner"]) || "Not provided",
  entity: pick(row.fields, ["investor entity","entity","company","fund"]) || "Not provided",
  assetClass: pick(row.fields, ["asset class","asset type","property type"]) || "Not provided",
  markets: pick(row.fields, ["target markets","markets","geography","region","target states"]) || "Not provided",
  priceRange: pick(row.fields, ["price range","deal size","target deal size","minimum price","maximum price"]) || "Not provided",
  units: pick(row.fields, ["unit count","minimum units","unit minimum","units"]) || "Not provided",
  strategy: pick(row.fields, ["strategy","investment strategy","deal type"]) || "Not provided",
  risk: pick(row.fields, ["risk appetite","risk profile"]) || "Not provided",
  returns: pick(row.fields, ["return targets","irr target","cash on cash","cap rate target"]) || "Not provided",
  holdPeriod: pick(row.fields, ["hold period"]) || "Not provided",
  requiredDocuments: pick(row.fields, ["required documents","documents required","submission requirements"]) || "Not provided",
  notes: pick(row.fields, ["notes","criteria","location rules","buy box details"]) || "Not provided",
  sourcePartner: pick(row.fields, ["source partner","partner","submission lane","provenance","created by"]) || "SBF WORLD partner lane",
  updated: pick(row.fields, ["last updated","updated","last edited time"]) || "Not provided",
});

const isBruceBuyBox = (row: Row) => {
  const relationship = [
    pick(row.fields, ["buy box name","mandate name","title","name","buy box"]),
    pick(row.fields, ["investor","buyer","investor name","owner","related investor"]),
    pick(row.fields, ["investor entity","entity","company","fund","related entity"]),
    pick(row.fields, ["related buy box","mandate","notes","criteria"]),
  ].join(" ");
  return /bruce edwards|eden elevations\s*3/i.test(relationship);
};

function scoreForMandate(base: BruceScore, mandate: ReturnType<typeof mapBuyBox>): BruceScore {
  const criteria = clean(`${mandate.assetClass} ${mandate.strategy} ${mandate.markets} ${mandate.notes}`);
  if (/bruce edwards|eden elevations|multifamily.*value add/i.test(`${mandate.title} ${criteria}`)) return base;
  let score = 0; const strengths: string[] = []; const blockers: string[] = [];
  const assetText = clean(`${base.assetClass} ${base.name}`);
  const desiredClasses = mandate.assetClass.split(/[,/;|]/).map(clean).filter(value => value.length > 2 && value !== "not provided");
  if (desiredClasses.some(value => assetText.includes(value) || value.includes(clean(base.assetClass)))) { score += 25; strengths.push("Asset class aligns with selected mandate"); } else blockers.push("Asset class alignment needs review");
  const marketTokens = mandate.markets.split(/[,/;|]/).map(clean).filter(v => v.length > 1 && v !== "not provided");
  if (marketTokens.some(value => clean(`${base.market} ${base.state}`).includes(value) || value.includes(clean(base.state)))) { score += 20; strengths.push("Geography aligns with selected mandate"); } else blockers.push("Geography not confirmed in selected mandate");
  const mandateNumbers = mandate.priceRange.match(/[0-9]+(?:\.[0-9]+)?/g)?.map(Number) || [];
  if (base.price && mandateNumbers.length) { score += 15; strengths.push("Price data available for mandate review"); } else blockers.push("Price criteria or asset value missing");
  const minUnits = numeric(mandate.units);
  if (base.units && (!minUnits || base.units >= minUnits)) { score += 15; strengths.push("Unit count meets available criteria"); } else blockers.push("Unit count missing or below mandate");
  if (mandate.strategy !== "Not provided" && clean(`${base.valueAddTriggers.join(" ")} ${base.name}`).includes(clean(mandate.strategy))) { score += 15; strengths.push("Strategy signal aligns"); } else if (base.valueAddTriggers.length) { score += 8; strengths.push("Opportunity includes an upside strategy signal"); } else blockers.push("Strategy fit needs review");
  if (base.hasT12 && base.hasRentRoll && base.noi) { score += 10; strengths.push("Core underwriting documents available"); } else blockers.push("Missing T12, rent roll, or NOI");
  return { ...base, score, strengths, blockers, label: score >= 90 ? "Strong Match" : score >= 75 ? "Good Match" : score >= 60 ? "Possible Match" : "Weak / Needs Review", blocked: !base.price || !base.units || !base.state, nextAction: !base.hasT12 || !base.hasRentRoll ? "Request missing documents" : score >= 75 ? "Request addition to My Matches" : "Review fit with SBF WORLD" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { buyBoxId?: string };
    // These are the same live, title-resolved God’s Blueprint sections used by
    // Active Matches. Bruce supplies investor scope; Brad supplies provenance.
    const portalResults = await Promise.allSettled([
      getDynamicPortalForEmail("bruce@edenelevations3.com"),
      getDynamicPortalForEmail("brad@keatyrealestate.com"),
    ]);
    const portals = portalResults.flatMap(result => result.status === "fulfilled" && result.value ? [result.value] : []);
    const portalErrors = portalResults.flatMap((result,index) => result.status === "rejected" ? [`${index===0?"Bruce":"Brad"} portal: ${result.reason instanceof Error ? result.reason.message : "unavailable"}`] : []);
    // Buy-box privacy boundary: only Bruce/Eden mandates leave this API.
    // The asset pool remains broad so every Bruce mandate can scan all
    // permitted SBF WORLD opportunities.
    const allBuyBoxRows = uniqueRows(rowsFromSections(portals,["buy-box-signals"]));
    const buyBoxRows = allBuyBoxRows.filter(isBruceBuyBox);
    const buyBoxes = buyBoxRows.map(mapBuyBox);
    const selected = buyBoxes.find(box => box.id === body.buyBoxId) || buyBoxes.find(box => /bruce edwards|eden elevations/i.test(`${box.title} ${box.investor} ${box.entity}`)) || buyBoxes[0] || null;
    const candidateRows = uniqueRows(rowsFromSections(portals,["complete-assets"])).filter((row) => isCompleteNewBuildAsset(row.fields));
    const uniqueAssets = new Map<string, BruceScore>();
    candidateRows.forEach(row => { const candidate = teaserCandidate(row.id, row.fields); const key = clean(`${candidate.name}|${candidate.market}`); const scored = scoreAssetForBruce(candidate); const current = uniqueAssets.get(key); if (!current || scored.score > current.score) uniqueAssets.set(key, scored); });
    const candidates = Array.from(uniqueAssets.values()).map(item => selected ? scoreForMandate(item, selected) : item).sort((a,b) => b.score-a.score);
    return NextResponse.json({ success: true, data: { investor: "Bruce Edwards", entity: "Eden Elevations 3", source: "God's Blueprint live portal sections", buyBoxes, selectedBuyBox: selected, candidates, counts: { buyBoxes: buyBoxes.length, candidates: candidates.length, strongGood: candidates.filter(item=>item.score>=75).length, blocked: candidates.filter(item=>item.blocked).length }, diagnostics: { portalsLoaded: portals.map(portal=>portal.user.email), allBuyBoxRows: allBuyBoxRows.length, bruceBuyBoxRows: buyBoxRows.length, candidateRows: candidateRows.length, sectionCounts: portals.map(portal=>({ email:portal.user.email, sections:Object.fromEntries(portal.sections.map(section=>[section.key,section.rows.length])) })), errors: portalErrors }, generatedAt: new Date().toISOString() } });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Matching engine unavailable." }, { status: 502 }); }
}
