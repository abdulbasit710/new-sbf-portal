import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type BradDatasetKey = "assets" | "buyBoxes" | "investors" | "underwriting" | "matches";
export type BradSafeRecord = { id: string; title: string; fields: Record<string, string>; sourceTitle: string; createdTime: string; editedTime: string };

export class BradPortalError extends Error {
  constructor(message: string, public source?: BradDatasetKey | "config") { super(message); this.name = "BradPortalError"; }
}

const configs: Record<BradDatasetKey, { env: string; title: string; relation: string[]; extra?: "active" }> = {
  assets: { env: "NOTION_ASSETS_DATABASE_ID", title: "05 — Assets — CORE", relation: ["Source Partner"] },
  buyBoxes: { env: "NOTION_BUY_BOX_DATABASE_ID", title: "06 — Buy Boxes & Mandates — CORE", relation: ["Owner Partner"], extra: "active" },
  investors: { env: "NOTION_INVESTORS_DATABASE_ID", title: "04 — Investors, Buyers & Lenders — CORE", relation: ["Source Partner"] },
  underwriting: { env: "NOTION_UNDERWRITING_DATABASE_ID", title: "07 — Underwriting Engine — CORE", relation: ["Related Partner"] },
  matches: { env: "NOTION_MATCHING_DATABASE_ID", title: "08 — Matching Engine — CORE", relation: ["Related Partner"] },
};

const denyField = /founder|internal|private economics|commission|fee split|legal strategy|bank|wire|password|secret|token|ssn|tax id|raw financial|underwriting logic/i;
const env = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value || /^replace_|^paste_|^auto$/i.test(value)) throw new BradPortalError(`${name} is not configured.`, "config");
  return value.replace(/-/g, "");
};
const optionalEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return !value || /^replace_|^paste_|^auto$/i.test(value) ? "" : value.replace(/-/g, "");
};
const notion = () => new Client({ auth: env("NOTION_API_KEY") });
const plain = (items: Array<{ plain_text?: string }> = []) => items.map((item) => item.plain_text || "").join("").trim();
const valueOf = (property: any): string => {
  if (!property) return "";
  switch (property.type) {
    case "title": return plain(property.title);
    case "rich_text": return plain(property.rich_text);
    case "number": return property.number == null ? "" : String(property.number);
    case "select": return property.select?.name || "";
    case "status": return property.status?.name || "";
    case "multi_select": return property.multi_select?.map((item: any) => item.name).join(", ") || "";
    case "checkbox": return property.checkbox ? "Yes" : "No";
    case "date": return property.date?.start || "";
    case "email": return property.email || "";
    case "phone_number": return property.phone_number || "";
    case "url": return property.url || "";
    case "relation": return property.relation?.map((item: any) => item.id).join(", ") || "";
    case "people": return property.people?.map((item: any) => item.name || item.id).join(", ") || "";
    case "created_time": return property.created_time || "";
    case "last_edited_time": return property.last_edited_time || "";
    case "formula": return property.formula ? String(property.formula[property.formula.type] ?? "") : "";
    case "rollup": return property.rollup?.type === "number" ? String(property.rollup.number ?? "") : "";
    default: return "";
  }
};
const normalizePage = (page: PageObjectResponse, sourceTitle: string): BradSafeRecord => {
  const fields: Record<string, string> = {};
  let title = "Untitled record";
  Object.entries(page.properties).forEach(([key, property]) => {
    const value = valueOf(property);
    if (property.type === "title" && value) title = value;
    if (value && !denyField.test(key)) fields[key] = value;
  });
  return { id: page.id, title, fields, sourceTitle, createdTime: page.created_time, editedTime: page.last_edited_time };
};

const schemaKey = (properties: Record<string, any>, aliases: string[], type?: string) => Object.keys(properties).find((key) =>
  aliases.some((alias) => key.toLowerCase() === alias.toLowerCase()) && (!type || properties[key]?.type === type),
);

const resolvedIds = new Map<string, string>();
const normalizeTitle = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const resultTitle = (item: any) => {
  if (Array.isArray(item.title)) return plain(item.title);
  const titleProperty = Object.values(item.properties || {}).find((property: any) => property?.type === "title") as any;
  return titleProperty ? plain(titleProperty.title) : "";
};
async function resolveExactNotionId(envName: string, exactTitle: string, object: "data_source" | "page") {
  const configured = optionalEnv(envName);
  if (configured) return configured;
  const cacheKey = `${object}:${exactTitle}`;
  const cached = resolvedIds.get(cacheKey);
  if (cached) return cached;
  const client = notion(); let cursor: string | undefined;
  do {
    const response = await client.search({ query: exactTitle, filter: { property: "object", value: object } as any, start_cursor: cursor, page_size: 100 });
    const exact = response.results.find((item) => normalizeTitle(resultTitle(item)) === normalizeTitle(exactTitle));
    if (exact?.id) { const id = exact.id.replace(/-/g, ""); resolvedIds.set(cacheKey, id); return id; }
    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);
  throw new BradPortalError(`${envName} is not configured and exact Notion ${object.replace("_", " ")} “${exactTitle}” was not found.`, "config");
}

async function resolveBradPartnerId() {
  const configured = optionalEnv("BRAD_PARTNER_PAGE_ID");
  if (configured) return configured;
  const cached = resolvedIds.get("partner:brad-gaubert");
  if (cached) return cached;
  const peopleId = await resolveExactNotionId(
    "NOTION_PEOPLE_DATA_SOURCE_ID",
    "02 — People, Members & Relationships — CORE",
    "data_source",
  );
  const pages = await queryDatabaseWithPagination(peopleId, undefined);
  const page = pages.find((candidate) => {
    const titleProperty = Object.values(candidate.properties).find((property: any) => property?.type === "title") as any;
    return normalizeTitle(titleProperty ? plain(titleProperty.title) : "") === "brad gaubert";
  });
  if (!page) throw new BradPortalError("Brad Gaubert was not found in 02 — People, Members & Relationships — CORE.", "config");
  const id = page.id.replace(/-/g, ""); resolvedIds.set("partner:brad-gaubert", id); return id;
}

async function resolveBradPartnerIdForRelation(relationProperty: any) {
  const configured = optionalEnv("BRAD_PARTNER_PAGE_ID");
  if (configured) return configured;
  const targetId = String(
    relationProperty?.relation?.data_source_id ||
    relationProperty?.relation?.database_id ||
    relationProperty?.data_source_id || "",
  ).replace(/-/g, "");
  if (!targetId) return resolveBradPartnerId();
  const cacheKey = `partner-target:${targetId}`;
  const cached = resolvedIds.get(cacheKey);
  if (cached) return cached;
  const pages = await queryDatabaseWithPagination(targetId);
  const page = pages.map((candidate) => {
    const titleProperty = Object.values(candidate.properties).find((property: any) => property?.type === "title") as any;
    const title = titleProperty ? plain(titleProperty.title) : "";
    const values = Object.values(candidate.properties).map(valueOf).join(" ");
    let score = 0;
    if (normalizeTitle(title) === "brad gaubert") score += 100;
    if (/\bbrad gaubert\b/i.test(title)) score += 40;
    if (/brad@keatyrealestate\.com/i.test(values)) score += 30;
    if (/\bbrad gaubert\b/i.test(values)) score += 10;
    if (/active|approved|partner/i.test(values)) score += 2;
    return { candidate, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)[0]?.candidate;
  if (!page) throw new BradPortalError("Brad Gaubert was not found in the partner database targeted by the CORE relation.", "config");
  const id = page.id.replace(/-/g, ""); resolvedIds.set(cacheKey, id); return id;
}

export const relationContainsFilter = (property: string, pageId: string) => ({ property, relation: { contains: pageId } });
export const checkboxEqualsFilter = (property: string, value: boolean) => ({ property, checkbox: { equals: value } });
export const statusNotEqualsFilter = (property: string, value: string, type: "status" | "select" = "status") => ({ property, [type]: { does_not_equal: value } });
export const safeNumberSum = (rows: BradSafeRecord[], aliases: string[]) => rows.reduce((sum, row) => {
  const entry = Object.entries(row.fields).find(([key]) => aliases.some((alias) => key.toLowerCase().includes(alias)));
  const value = Number((entry?.[1] || "").replace(/[$,]/g, "")); return sum + (Number.isFinite(value) ? value : 0);
}, 0);

async function queryDatabaseWithPagination(dataSourceId: string, filter?: any) {
  const client = notion(); const pages: PageObjectResponse[] = []; let cursor: string | undefined;
  do {
    const response = await client.dataSources.query({ data_source_id: dataSourceId, ...(filter ? { filter } : {}), start_cursor: cursor, page_size: 100 });
    pages.push(...response.results.filter((item): item is PageObjectResponse => item.object === "page" && "properties" in item));
    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);
  return pages;
}

export async function getBradDataset(key: BradDatasetKey, visibleOnly = false): Promise<BradSafeRecord[]> {
  const config = configs[key];
  try {
    const dataSourceId = await resolveExactNotionId(config.env, config.title, "data_source");
    const client = notion();
    const source = await client.dataSources.retrieve({ data_source_id: dataSourceId });
    const properties = (source as any).properties || {};
    const relationKey = schemaKey(properties, config.relation, "relation");
    if (!relationKey) throw new BradPortalError(`${config.title} is missing the required ${config.relation[0]} relation.`, key);
    const partnerId = await resolveBradPartnerIdForRelation(properties[relationKey]);
    const filters: any[] = [relationContainsFilter(relationKey, partnerId)];
    if (config.extra === "active") {
      const statusKey = schemaKey(properties, ["Status"]);
      if (statusKey) filters.push(statusNotEqualsFilter(statusKey, "Archived", properties[statusKey].type === "select" ? "select" : "status"));
    }
    if (visibleOnly) {
      const visibleKey = schemaKey(properties, ["Visibility Allowed"], "checkbox");
      if (!visibleKey) throw new BradPortalError(`${config.title} is missing the Visibility Allowed checkbox.`, key);
      filters.push(checkboxEqualsFilter(visibleKey, true));
    }
    const pages = await queryDatabaseWithPagination(dataSourceId, filters.length === 1 ? filters[0] : { and: filters });
    return pages.map((page) => normalizePage(page, config.title));
  } catch (error) {
    if (error instanceof BradPortalError) throw error;
    const code = (error as any)?.code || "unknown_error";
    console.error(`[Brad Portal] ${config.title} query failed (${code}).`, error instanceof Error ? error.message : error);
    throw new BradPortalError(`${config.title} could not be queried (${code}). Check its ID and Notion integration access.`, key);
  }
}

export async function getBradAllData() {
  const [assets, buyBoxes, investors, underwriting, matches, visibleMatches] = await Promise.all([
    getBradDataset("assets"), getBradDataset("buyBoxes"), getBradDataset("investors"),
    getBradDataset("underwriting"), getBradDataset("matches"), getBradDataset("matches", true),
  ]);
  return { assets, buyBoxes, investors, underwriting, matches, visibleMatches };
}

const field = (row: BradSafeRecord, aliases: string[]) => Object.entries(row.fields).find(([key]) => aliases.some((alias) => key.toLowerCase().includes(alias)))?.[1] || "";
export async function getBradSummary() {
  const data = await getBradAllData();
  const highestScore = Math.max(0, ...data.matches.map((row) => Number(field(row, ["match score", "score"]).replace(/[^0-9.]/g, "")) || 0));
  return {
    assets: { total: data.assets.length, visible: data.assets.length, totalValue: safeNumberSum(data.assets, ["value", "price", "amount"]) },
    buyBoxes: { total: data.buyBoxes.length, active: data.buyBoxes.length, capitalAvailable: safeNumberSum(data.buyBoxes, ["capital", "budget", "capacity"]) },
    investors: { total: data.investors.length, knownCapacity: safeNumberSum(data.investors, ["capacity", "capital", "aum"]) },
    underwriting: { total: data.underwriting.length, founderReviewNeeded: data.underwriting.filter((row) => /review|pending/i.test(field(row, ["status", "stage"]))).length },
    matches: { total: data.matches.length, visible: data.visibleMatches.length, highestScore },
  };
}

export async function getBradActivity() {
  const data = await getBradAllData();
  return [...data.assets, ...data.buyBoxes, ...data.investors, ...data.underwriting, ...data.matches]
    .sort((a, b) => b.editedTime.localeCompare(a.editedTime)).slice(0, 50);
}

export async function getBradHealth() {
  const results = await Promise.all(Object.keys(configs).map(async (key) => {
    try { const rows = await getBradDataset(key as BradDatasetKey); return { source: key, ok: true, count: rows.length }; }
    catch (error) { return { source: key, ok: false, error: error instanceof Error ? error.message : "Query failed" }; }
  }));
  return { ok: results.every((item) => item.ok), configured: { notionApiKey: Boolean(process.env.NOTION_API_KEY), bradPartnerPageId: Boolean(process.env.BRAD_PARTNER_PAGE_ID), automaticExactTitleResolution: true }, sources: results };
}
