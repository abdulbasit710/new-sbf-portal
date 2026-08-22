import { NextResponse } from "next/server";
import { CorePortalError, getCorePortalBundle } from "@/lib/corePortal";
import { PortalAccessError, requirePortalSession } from "@/lib/portalAuth";
import type { BruceVisibleMatch } from "@/lib/bruceVisibleMatches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const field = (fields: Record<string, string>, names: string[]) => {
  for (const name of names) {
    const match = Object.entries(fields).find(([key]) => normalize(key) === normalize(name));
    if (match?.[1]) return match[1];
  }
  return "";
};
const amount = (value = "") => {
  const number = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : 0;
};
const compact = (value: number) => !value ? "Not provided" : value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(value >= 10e6 ? 0 : 1)}M` : `$${value.toLocaleString()}`;

export async function POST(request: Request) {
  try {
    const identity = requirePortalSession(request);
    const bundle = await getCorePortalBundle(identity);
    const rows = bundle.sections.find((section) => section.key === "active-matches")?.rows || [];
    const matches: BruceVisibleMatch[] = rows.map((row) => {
      const value = amount(field(row.fields, ["Teaser Price", "Visible Value", "Price"]));
      const score = field(row.fields, ["Match Score"]);
      const market = field(row.fields, ["Teaser Location", "Location", "Market"]);
      const assetType = field(row.fields, ["Teaser Asset Type", "Teaser Asset Class", "Asset Type"]);
      return {
        id: row.id,
        title: row.title,
        market,
        assetType,
        score: score && Number(score) > 0 && Number(score) <= 1 ? String(Math.round(Number(score) * 100)) : score,
        status: field(row.fields, ["Status", "Match Status"]) || "Status not provided",
        visibility: field(row.fields, ["Reveal Stage"]) || "Reveal stage not provided",
        value,
        valueLabel: compact(value),
        teaser: field(row.fields, ["Match Reason", "Teaser Summary", "Summary"]) || "Founder-approved canonical match.",
        nextStep: field(row.fields, ["Next Action"]) || "Review teaser",
        underwritingStatus: field(row.fields, ["Financial Readiness", "Full Underwriting Status"]) || "Not provided",
        ndaRequired: field(row.fields, ["NDA Gate", "NDA Required"]) || "Required for full reveal",
        dataCleanupNeeded: false,
        includeReasons: ["Canonical DB 08 row", "Linked to Brad", "Linked to Bruce", "Linked to one of Bruce's two buy boxes"],
        sourceTitle: row.sourceTitle || "08 — Matching Engine — CORE",
        fields: row.fields,
      };
    });
    matches.sort((a, b) => Number(b.score) - Number(a.score));
    return NextResponse.json({ success: true, data: { matches, visibleValue: matches.reduce((sum, match) => sum + match.value, 0), debug: [] } });
  } catch (error) {
    const status = error instanceof PortalAccessError || error instanceof CorePortalError ? error.status : 502;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to load canonical matches." }, { status });
  }
}
