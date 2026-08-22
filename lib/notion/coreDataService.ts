import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type CoreSourceKey = "intake" | "people" | "partners" | "capital" | "assets" | "mandates" | "underwriting" | "matches" | "vault" | "deals" | "documents" | "submissions" | "events" | "payments" | "cigars" | "pillars";

export interface CoreRecord {
  id: string;
  sourceKey: CoreSourceKey;
  sourceTitle: string;
  fields: Record<string, string>;
}

export interface CoreMetrics {
  people: number;
  partners: number;
  investors: number;
  lenders: number;
  assets: number;
  submissions: number;
  matches: number;
  matchReadyMandates: number;
  approvalsNeeded: number;
  approved: number;
  locked: number;
  pendingReview: number;
  totalVisibleAmount: number;
}

export interface CoreDiagnostics {
  rootPageId: string;
  databaseIds: Record<string, string[]>;
  lastSuccessfulSyncTime: string;
  recordsReturned: Record<string, number>;
  failedSources: Array<{ source: string; databaseId: string; error: string }>;
  unavailableSourceKeys: string[];
  mode: "live";
}

export interface CoreDataSnapshot {
  metrics: CoreMetrics;
  records: CoreRecord[];
  sources: Array<{
    key: CoreSourceKey;
    name: string;
    databaseIds: string[];
    count: number | null;
    status: "live" | "unavailable" | "permission_denied" | "error";
    error: string;
    fetchedAt: string;
    live: boolean;
  }>;
  diagnostics: CoreDiagnostics;
}

export class CoreConfigurationError extends Error {}
export class CoreUnavailableError extends Error {
  constructor(message: string, public readonly failures: CoreDiagnostics["failedSources"] = []) { super(message); }
}

const TITLES: Record<CoreSourceKey, string> = {
  intake: "01 — Universal Intake — CORE",
  people: "02 — People, Members & Relationships — CORE",
  partners: "03 — Partner Registry — CORE",
  capital: "04 — Investors, Buyers & Lenders — CORE",
  assets: "05 — Assets — CORE",
  mandates: "06 — Buy Boxes & Mandates — CORE",
  underwriting: "07 — Underwriting Engine — CORE",
  matches: "08 — Matching Engine — CORE",
  vault: "09 — Vault & Controlled Reveal — CORE",
  deals: "10 — Deals, LOI, PSA & Closing — CORE",
  documents: "11 — Documents & Governance — CORE",
  submissions: "12 — Partner Submissions — CORE",
  events: "12 — Events & Member Access — CORE",
  payments: "13 — Payments, Revenue & Payouts — CORE",
  cigars: "14 — Cigar Products, Inventory & Orders — CORE",
  pillars: "15 — Pillar HQ Registry — CORE",
};

const value = (...keys: string[]) => keys.map((key) => process.env[key]?.trim()).find((item) => item && item !== "auto" && !item.startsWith("replace_with_")) || "";
const ids = (...keys: string[]) => keys.flatMap((key) => (process.env[key] || "").split(/[;,]/)).map((id) => id.trim()).filter((id) => id && id !== "auto" && !id.startsWith("replace_with_"));

export function getCanonicalCoreConfig() {
  const config = {
    token: value("NOTION_TOKEN", "NOTION_API_KEY"),
    rootPageId: value("NOTION_CORE_ROOT_PAGE_ID"),
    sources: {
      intake: ids("NOTION_INTAKE_DATABASE_ID"),
      people: ids("NOTION_PEOPLE_DATABASE_ID"),
      partners: ids("NOTION_PARTNERS_DATABASE_ID"),
      capital: ids("NOTION_INVESTORS_DATABASE_ID"),
      assets: ids("NOTION_ASSETS_DATABASE_ID"),
      submissions: ids("NOTION_SUBMISSIONS_DATABASE_IDS"),
      matches: ids("NOTION_MATCHING_DATABASE_ID"),
      mandates: ids("NOTION_MANDATES_DATABASE_ID"),
      underwriting: ids("NOTION_UNDERWRITING_DATABASE_ID"),
      vault: ids("NOTION_VAULT_DATABASE_ID"),
      deals: ids("NOTION_DEALS_DATABASE_ID"),
      documents: ids("NOTION_DOCUMENTS_DATABASE_ID"),
      events: ids("NOTION_EVENTS_DATABASE_ID"),
      payments: ids("NOTION_PAYMENTS_DATABASE_ID"),
      cigars: ids("NOTION_CIGARS_DATABASE_ID"),
      pillars: ids("NOTION_PILLARS_DATABASE_ID"),
    } satisfies Record<CoreSourceKey, string[]>,
  };
  const missing = [!config.token && "NOTION_TOKEN", !config.rootPageId && "NOTION_CORE_ROOT_PAGE_ID", ...Object.entries(config.sources).map(([key, sourceIds]) => !sourceIds.length && `canonical ${key} database ID`)].filter(Boolean);
  if (missing.length) throw new CoreConfigurationError(`Missing canonical CORE configuration: ${missing.join(", ")}.`);
  return config;
}

const richText = (parts: Array<{ plain_text?: string }> | undefined) => parts?.map((part) => part.plain_text || "").join("") || "";
const propertyText = (property: any): string => {
  if (!property) return "";
  if (property.type === "title") return richText(property.title);
  if (property.type === "rich_text") return richText(property.rich_text);
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || "";
  if (property.type === "multi_select") return property.multi_select?.map((item: any) => item.name).join(", ") || "";
  if (property.type === "checkbox") return String(Boolean(property.checkbox));
  if (property.type === "number") return property.number == null ? "" : String(property.number);
  if (property.type === "formula") return String(property.formula?.string ?? property.formula?.number ?? property.formula?.boolean ?? "");
  if (property.type === "email" || property.type === "phone_number" || property.type === "url") return property[property.type] || "";
  if (property.type === "people") return property.people?.map((person: any) => person.name || person.id).join(", ") || "";
  if (property.type === "relation") return property.relation?.map((relation: any) => relation.id).join(", ") || "";
  if (property.type === "date") return property.date?.start || "";
  return "";
};

const fieldsFor = (page: PageObjectResponse) => Object.fromEntries(Object.entries(page.properties).map(([key, property]) => [key, propertyText(property)]));
const field = (fields: Record<string, string>, names: string[]) => {
  const wanted = names.map((name) => name.toLowerCase());
  const entry = Object.entries(fields).find(([key]) => wanted.includes(key.toLowerCase()));
  return entry?.[1]?.trim() || "";
};
const statusOf = (record: CoreRecord) => field(record.fields, ["Status", "Review Status", "Approval Status", "Submission Status", "Asset Status", "Match Status", "Admin Decision"]);
const isPending = (record: CoreRecord) => /pending review|needs approval|submitted|in review|needs review|awaiting approval/i.test(statusOf(record));
const isApproved = (record: CoreRecord) => /approved|cleared|active|verified/i.test(statusOf(record)) && !isPending(record);
const isLocked = (record: CoreRecord) => /^(true|yes|1|locked|frozen|restricted)$/i.test(field(record.fields, ["Locked", "Frozen", "Restricted", "Lock Status", "Project Locked"])) || /locked|frozen|restricted/i.test(statusOf(record));
const amount = (record: CoreRecord) => {
  const raw = field(record.fields, ["Amount", "Value", "Budget", "Price", "Purchase Price", "Capital Amount"]).replace(/,/g, "").toLowerCase();
  const match = raw.match(/-?\$?\s*(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const base = Number(match[1]);
  return base * (/(bn|billion|b)$/.test(raw) ? 1e9 : /(mm|million|m)$/.test(raw) ? 1e6 : /(k|thousand)$/.test(raw) ? 1e3 : 1);
};

async function queryAll(client: Client, dataSourceId: string, token: string) {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  try {
    do {
      const response = await client.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 });
      pages.push(...response.results.filter((item): item is PageObjectResponse => item.object === "page" && "properties" in item));
      cursor = response.has_more ? response.next_cursor || undefined : undefined;
    } while (cursor);
  } catch {
    // God's Blueprint CORE surfaces linked database containers. Query the
    // container directly when the newer data-source endpoint is unavailable.
    pages.length = 0;
    cursor = undefined;
    do {
      const response = await fetch(`https://api.notion.com/v1/databases/${dataSourceId}/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        cache: "no-store",
      });
      const payload = await response.json() as { results?: unknown[]; has_more?: boolean; next_cursor?: string | null; message?: string };
      if (!response.ok) throw new Error(payload.message || `Notion database query failed (${response.status})`);
      pages.push(...(payload.results || []).filter((item): item is PageObjectResponse => Boolean(item && typeof item === "object" && "properties" in item)));
      cursor = payload.has_more ? payload.next_cursor || undefined : undefined;
    } while (cursor);
  }
  return pages;
}

let cached: { expires: number; snapshot: CoreDataSnapshot } | undefined;
export function invalidateCoreDataCache() { cached = undefined; }

export async function getCanonicalCoreData(options: { forceRefresh?: boolean } = {}): Promise<CoreDataSnapshot> {
  if (!options.forceRefresh && cached && cached.expires > Date.now()) return cached.snapshot;
  const config = getCanonicalCoreConfig();
  const client = new Client({ auth: config.token, timeoutMs: 20_000 });
  await client.pages.retrieve({ page_id: config.rootPageId }).catch((error) => { throw new CoreUnavailableError(`Canonical CORE root is unavailable: ${error instanceof Error ? error.message : String(error)}`); });
  const failures: CoreDiagnostics["failedSources"] = [];
  const records: CoreRecord[] = [];
  const counts: Record<string, number> = {};
  await Promise.all(Object.entries(config.sources).flatMap(([sourceKey, sourceIds]) => sourceIds.map(async (databaseId) => {
    const label = `${sourceKey}:${databaseId}`;
    try {
      const pages = await queryAll(client, databaseId, config.token);
      counts[label] = pages.length;
      records.push(...pages.map((page) => ({ id: page.id, sourceKey: sourceKey as CoreSourceKey, sourceTitle: TITLES[sourceKey as CoreSourceKey], fields: fieldsFor(page) })));
    } catch (error) {
      failures.push({ source: sourceKey, databaseId, error: error instanceof Error ? error.message : String(error) });
    }
  })));
  if (!Object.keys(counts).length) throw new CoreUnavailableError("Live CORE data unavailable", failures);
  const deduped = Array.from(new Map(records.map((record) => [`${record.sourceKey}:${record.id.replace(/-/g, "")}`, record])).values());
  const by = (key: CoreSourceKey) => deduped.filter((record) => record.sourceKey === key);
  const capital = by("capital");
  const metrics: CoreMetrics = {
    people: by("people").length,
    partners: by("partners").length,
    investors: capital.filter((record) => /investor|buyer/i.test(field(record.fields, ["Role", "Type", "Relationship Type", "Capital Type"]))).length,
    lenders: capital.filter((record) => /lender|debt/i.test(field(record.fields, ["Role", "Type", "Relationship Type", "Capital Type"]))).length,
    assets: by("assets").length,
    submissions: by("submissions").length,
    matches: by("matches").length,
    matchReadyMandates: by("mandates").filter((record) => /match.ready|ready|active|approved/i.test(statusOf(record) + " " + field(record.fields, ["Match Ready", "Ready for Matching"]))).length,
    approvalsNeeded: deduped.filter(isPending).length,
    approved: deduped.filter(isApproved).length,
    locked: deduped.filter(isLocked).length,
    pendingReview: deduped.filter(isPending).length,
    totalVisibleAmount: deduped.reduce((sum, record) => sum + amount(record), 0),
  };
  const fetchedAt = new Date().toISOString();
  const sourceResults = (Object.keys(config.sources) as CoreSourceKey[]).map((key) => {
    const sourceFailures = failures.filter((failure) => failure.source === key);
    const successfulCounts = Object.entries(counts).filter(([name]) => name.startsWith(`${key}:`)).map(([, count]) => count);
    const error = sourceFailures.map((failure) => failure.error).join(" | ");
    const status: CoreDataSnapshot["sources"][number]["status"] = !sourceFailures.length ? "live" : /permission|unauthorized|restricted/i.test(error) ? "permission_denied" : /not found|object_not_found/i.test(error) ? "unavailable" : "error";
    return { key, name: TITLES[key], databaseIds: config.sources[key], count: sourceFailures.length ? null : successfulCounts.reduce((sum, count) => sum + count, 0), status, error, fetchedAt, live: status === "live" };
  });
  const snapshot = { metrics, records: deduped, sources: sourceResults, diagnostics: { rootPageId: config.rootPageId, databaseIds: config.sources, lastSuccessfulSyncTime: fetchedAt, recordsReturned: counts, failedSources: failures, unavailableSourceKeys: Array.from(new Set(failures.map((failure) => failure.source))), mode: "live" as const } };
  cached = { expires: Date.now() + 30_000, snapshot };
  return snapshot;
}
