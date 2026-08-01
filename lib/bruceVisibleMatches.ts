import { findApprovedPortalUser, getDynamicPortalForEmail, type PortalDatabaseRow } from "@/lib/notionService";

export type BruceVisibleMatch = {
  id: string;
  title: string;
  market: string;
  assetType: string;
  score: string;
  status: string;
  visibility: string;
  value: number;
  valueLabel: string;
  teaser: string;
  nextStep: string;
  underwritingStatus: string;
  ndaRequired: string;
  dataCleanupNeeded: boolean;
  includeReasons: string[];
  sourceTitle: string;
  fields: Record<string, string>;
};

export type BruceMatchDebug = { id: string; title: string; included: boolean; reasons: string[] };

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const stripId = (value = "") => value.replace(/-/g, "").toLowerCase();
const field = (fields: Record<string, string>, names: string[]) => {
  const entries = Object.entries(fields);
  for (const name of names) {
    const exact = entries.find(([key]) => normalize(key) === normalize(name));
    if (exact?.[1]) return exact[1];
  }
  return entries.find(([key]) => names.some((name) => normalize(key).includes(normalize(name))))?.[1] || "";
};
const amount = (value = "") => {
  const match = value.replace(/,/g, "").match(/-?\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  let result = Number(match[1]);
  if (/\b(b|bn|billion)\b/i.test(value)) result *= 1e9;
  else if (/\b(m|mm|million)\b/i.test(value)) result *= 1e6;
  else if (/\b(k|thousand)\b/i.test(value)) result *= 1e3;
  return Number.isFinite(result) ? result : 0;
};
const compact = (value: number) => !value ? "Not provided" : value >= 1e9 ? `$${(value/1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value/1e6).toFixed(value >= 10e6 ? 0 : 1)}M` : `$${value.toLocaleString()}`;

function inclusionDecision(row: PortalDatabaseRow): BruceMatchDebug {
  const fields = row.fields;
  const title = row.title || field(fields, ["asset name", "match name", "title", "name"]);
  const investor = field(fields, ["related investor", "investor", "buyer", "investor name"]);
  const entity = field(fields, ["related investor entity", "investor entity", "entity", "company"]);
  const buyBox = field(fields, ["related buy box", "buy box", "mandate"]);
  const notes = field(fields, ["related notes", "notes", "match reason", "comments"]);
  const visibility = field(fields, ["portal visibility", "visibility", "reveal status", "bruce visibility"]);
  const status = field(fields, ["match status", "status", "approval status", "admin decision"]);
  const request = field(fields, ["request", "request type", "action"]);
  const submittedBy = field(fields, ["submitted by", "investor scope", "partner scope", "email"]);
  const reasons: string[] = [];
  if (/bruce edwards/i.test(investor)) reasons.push("Related investor contains Bruce Edwards");
  if (/eden elevations 3/i.test(entity)) reasons.push("Related entity contains Eden Elevations 3");
  if (/bruce edwards/i.test(buyBox)) reasons.push("Related buy box contains Bruce Edwards");
  if (/bruce edwards/i.test(title)) reasons.push("Title contains Bruce Edwards");
  if (/bartlett crossing/i.test(title) && /bruce/i.test(notes)) reasons.push("Bartlett Crossing notes mention Bruce");
  if (/approved/i.test(visibility)) reasons.push("Portal visibility is Approved");
  if (/approved/i.test(status)) reasons.push("Status is Approved");
  if (/add to my matches/i.test(request) && /bruce|edenelevations3\.com/i.test(submittedBy)) reasons.push("Bruce requested addition to My Matches");
  const isPending = /submitted|pending|review|requested|new|needs docs/i.test(`${status} ${visibility}`) && !/approved/i.test(`${status} ${visibility}`);
  const isRejected = /rejected|declined|denied/i.test(`${status} ${visibility}`);
  if (isPending) reasons.push("Awaiting admin approval");
  if (isRejected) reasons.push("Admin declined this match");
  return { id: row.id, title: title || "Untitled match", included: reasons.length > 0 && !isPending && !isRejected, reasons: reasons.length ? reasons : ["No Bruce relationship or approved teaser-safe status"] };
}

function normalizeMatch(row: PortalDatabaseRow, reasons: string[]): BruceVisibleMatch {
  const title = row.title || field(row.fields, ["asset name", "match name", "opportunity name", "deal name", "title", "name"]) || "Confidential opportunity";
  const market = field(row.fields, ["market", "geography", "location", "region"]);
  const assetType = field(row.fields, ["asset type", "asset class", "property type", "type"]);
  const score = field(row.fields, ["match score", "score"]);
  const rawValue = field(row.fields, ["visible value", "purchase price", "deal size", "price", "value", "asking price", "capital requested"]);
  const value = amount(rawValue);
  return {
    id: row.id, title, market, assetType, score,
    status: field(row.fields, ["match status", "status", "stage"]) || "Approved",
    visibility: field(row.fields, ["portal visibility", "visibility", "reveal status"]) || "Approved teaser",
    value, valueLabel: compact(value),
    teaser: field(row.fields, ["teaser", "safe summary", "executive summary", "match reason", "summary"]) || "Approved teaser-safe opportunity. Additional details become available as qualification gates are completed.",
    nextStep: field(row.fields, ["next step", "next action", "recommended action"]) || "Review teaser",
    underwritingStatus: field(row.fields, ["underwriting status", "underwriting", "diligence status"]) || "Not provided",
    ndaRequired: field(row.fields, ["nda required", "nda status", "nda requirement"]) || "Required for full reveal",
    dataCleanupNeeded: !value || !market || !score || !assetType,
    includeReasons: reasons,
    sourceTitle: row.sourceTitle || "08 — Matching Engine — CORE",
    fields: row.fields,
  };
}

export async function getBruceVisibleMatches(email = "bruce@edenelevations3.com") {
  const portal = await getDynamicPortalForEmail(email);
  if (!portal) return { matches: [] as BruceVisibleMatch[], visibleValue: 0, debug: [] as BruceMatchDebug[] };
  const sourceRows = portal.sections.filter((section) => ["active-matches", "deal-flow"].includes(section.key)).flatMap((section) => section.rows);
  const byPage = new Map<string, PortalDatabaseRow>();
  sourceRows.forEach((row) => {
    const key = stripId(row.id) || `${normalize(row.title)}|${normalize(field(row.fields, ["market", "location"]))}`;
    const current = byPage.get(key);
    if (!current || Object.values(row.fields).filter(Boolean).length > Object.values(current.fields).filter(Boolean).length) byPage.set(key, row);
  });
  const decisions = Array.from(byPage.values()).map((row) => ({ row, decision: inclusionDecision(row) }));
  const normalized = decisions.filter(({ decision }) => decision.included).map(({ row, decision }) => normalizeMatch(row, decision.reasons));
  const final = new Map<string, BruceVisibleMatch>();
  normalized.forEach((match) => {
    const signature = `${normalize(match.title)}|${normalize(match.market)}|${match.value}`;
    const current = final.get(signature);
    const completeness = (item: BruceVisibleMatch) => [item.market, item.assetType, item.score, item.value].filter(Boolean).length;
    if (!current || completeness(match) > completeness(current)) final.set(signature, match);
  });
  const matches = Array.from(final.values()).sort((a, b) => (Number(b.score.replace(/[^0-9.]/g, "")) || 0) - (Number(a.score.replace(/[^0-9.]/g, "")) || 0));
  return { matches, visibleValue: matches.reduce((sum, match) => sum + match.value, 0), debug: decisions.map(({ decision }) => decision) };
}

export async function getInvestorPofStatus(email: string) {
  const user = await findApprovedPortalUser(email);
  const fields = user?.rawFields || {};
  const value = field(fields, ["proof of funds status", "proof of funds", "pof status", "pof"]);
  return { pofReady: /approved|verified|uploaded|received|on file|complete|yes/i.test(value), pofStatus: value || "Not uploaded" };
}
