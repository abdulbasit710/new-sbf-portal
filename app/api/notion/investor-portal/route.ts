import { NextResponse } from "next/server";
import { getBlueprintPagesForRole, NotionConfigError } from "@/lib/notionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const ALLOWED_KEYS = new Set([
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

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; name?: string; contactId?: string };
    const email = body.email?.trim().toLowerCase() || "";
    if (!email) return NextResponse.json({ success: false, error: "Investor email is required." }, { status: 400 });

    const identity = [email, body.name, body.contactId].filter(Boolean).map((value) => normalize(value));
    const pages = (await getBlueprintPagesForRole("investor"))
      .filter((page) => ALLOWED_KEYS.has(page.key))
      .map((page) => ({
        ...page,
        // Database rows are filtered on the server. Unrelated investor/team records
        // never enter the API response or the browser.
        blocks: page.blocks.map((block) => {
          const source = block as typeof block & { databaseRows?: Array<Record<string, string>> };
          if (!source.databaseRows) return block;
          const databaseRows = source.databaseRows.filter((row) => {
            const haystack = normalize(Object.values(row).join(" "));
            return identity.some((token) => token.length > 3 && haystack.includes(token));
          });
          return { ...block, databaseRows, rows: databaseRows.map((row) => Object.values(row)), fields: { ...(block.fields || {}), record_count: String(databaseRows.length) } };
        }),
        fields: {},
      }));

    return NextResponse.json({ success: true, data: { source: "gods-blueprint", scope: "investor-only", pages } });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to load investor portal." }, { status });
  }
}
