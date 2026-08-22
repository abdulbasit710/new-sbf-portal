export const BRUCE_TARGET_STATES = ["AL","AZ","AR","CO","FL","GA","ID","IN","IA","KS","KY","LA","MO","NE","NV","NC","OH","OK","SC","SD","TN","TX","UT","WI"];

export type BruceCandidate = {
  id: string; name: string; market: string; state: string; assetClass: string;
  price: number | null; units: number | null; yearBuilt: number | null;
  valueAddTriggers: string[]; neighborhoodGrade: string; safetyPass: boolean | null;
  hasT12: boolean; hasRentRoll: boolean; noi: number | null; underwritingStatus: string;
  visibility: string; partner: string; updated: string;
  registryId?: string; pillar?: string; dealType?: string; revenuePotential?: string;
  capRate?: string; matchCriteria?: string; geographyMatch?: string; teaserSummary?: string;
};

export type BruceScore = BruceCandidate & { score: number; label: string; strengths: string[]; blockers: string[]; nextAction: string; blocked: boolean };

const numberFrom = (value = "") => {
  const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  let number = Number(match[1]);
  if (/\b(b|bn|billion)\b/i.test(value)) number *= 1_000_000_000;
  else if (/\b(m|mm|million)\b/i.test(value)) number *= 1_000_000;
  else if (/\b(k|thousand)\b/i.test(value)) number *= 1_000;
  return Number.isFinite(number) ? number : null;
};

const pick = (fields: Record<string, string>, names: string[]) => {
  const rows = Object.entries(fields);
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const name of names) {
    const found = rows.find(([key]) => clean(key) === clean(name));
    if (found?.[1]) return found[1];
  }
  return rows.find(([key]) => names.some((name) => clean(key).includes(clean(name))))?.[1] || "";
};

export function teaserCandidate(id: string, fields: Record<string, string>): BruceCandidate {
  const docs = pick(fields, ["available documents", "documents", "document status"]);
  const upside = pick(fields, ["value add triggers", "value add", "strategy", "opportunity", "deal thesis"]);
  const market = pick(fields, ["market", "city state", "location", "geography"]);
  const state = (pick(fields, ["state"]) || market.match(/\b[A-Z]{2}\b/)?.[0] || "").toUpperCase();
  return {
    id,
    name: pick(fields, ["coded name", "asset name", "opportunity name", "deal name", "title", "name"]) || "Confidential multifamily opportunity",
    market: market || "Market not provided",
    state,
    assetClass: pick(fields, ["asset class", "asset type", "property type", "type"]),
    price: numberFrom(pick(fields, ["purchase price", "asking price", "deal size", "price", "value"])),
    units: numberFrom(pick(fields, ["unit count", "units", "number of units"])),
    yearBuilt: numberFrom(pick(fields, ["year built", "vintage"])),
    valueAddTriggers: upside ? [upside] : [],
    neighborhoodGrade: pick(fields, ["neighborhood grade", "location grade", "submarket grade"]),
    safetyPass: /pass|approved|acceptable|below national|low crime/i.test(pick(fields, ["safety pass", "crime screen", "safety", "crime"] )) ? true : null,
    hasT12: /t12/i.test(docs), hasRentRoll: /rent roll/i.test(docs),
    noi: numberFrom(pick(fields, ["t12 noi", "noi", "net operating income"])),
    underwritingStatus: pick(fields, ["underwriting status", "stage", "status"]) || "Not started",
    visibility: pick(fields, ["bruce visibility", "portal visibility", "visibility", "reveal status"]) || "Internal review",
    partner: pick(fields, ["source partner", "submission partner", "partner", "source lane"]) || "Brad + Danny partner lane",
    updated: pick(fields, ["last updated", "updated", "last edited time"]),
  };
}

export function scoreAssetForBruce(asset: BruceCandidate): BruceScore {
  let score = 0;
  const strengths: string[] = [];
  const blockers: string[] = [];
  if (/multifamily|apartment|townhome/i.test(asset.assetClass + " " + asset.name)) { score += 20; strengths.push("Matches the multifamily mandate"); } else blockers.push("Asset class does not clearly match multifamily");
  if (asset.units && asset.units >= 70) { score += 15; strengths.push("Meets the 70+ unit minimum"); } else blockers.push("Missing or below minimum unit count");
  if (asset.price && asset.price >= 15_000_000 && asset.price <= 100_000_000) { score += 15; strengths.push("Within the $15MM–$100MM target range"); } else if (asset.price && asset.price > 100_000_000) { score += 8; strengths.push("Above standard range but may fit $100MM+ flexibility"); } else blockers.push("Missing or outside target price range");
  if (BRUCE_TARGET_STATES.includes(asset.state)) { score += 15; strengths.push("Located in a target state"); } else blockers.push("Target geography needs review");
  if (asset.valueAddTriggers.length) { score += 15; strengths.push("Value-add or operational upside identified"); } else blockers.push("No value-add trigger identified");
  if (/^[AB]/i.test(asset.neighborhoodGrade) || asset.safetyPass) { score += 10; strengths.push("Location / safety screen appears acceptable"); } else blockers.push("Location / crime screen missing or weak");
  if (asset.hasT12 && asset.hasRentRoll && asset.noi) { score += 10; strengths.push("Core underwriting documents available"); } else blockers.push("Missing T12, rent roll, or NOI");
  const critical = !asset.units || !asset.price || !asset.state || !asset.noi;
  const label = score >= 90 ? "Strong Match" : score >= 75 ? "Good Match" : score >= 60 ? "Possible Match" : "Weak / Needs Review";
  const nextAction = !asset.hasT12 || !asset.hasRentRoll ? "Request missing financial documents" : /internal|founder/i.test(asset.visibility) ? "Route for founder visibility review" : "Prepare Bruce-safe teaser";
  return { ...asset, score, label, strengths, blockers, nextAction, blocked: critical };
}
