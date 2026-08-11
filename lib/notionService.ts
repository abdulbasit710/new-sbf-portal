import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  BLUEPRINT_MODULES,
  modulesForRole,
  type BlueprintModule,
  type BlueprintModuleKey,
} from "./blueprintRegistry";
import type { Role } from "./types";
import { isCompleteNewBuildAsset } from "./assetCompleteness";

export interface GoldEmblemData {
  title: string;
  type: "image";
  imageUrl: string;
  caption: string;
  source: "notion";
}

export interface NotionContentBlock {
  id: string;
  type: string;
  text?: string;
  checked?: boolean;
  imageUrl?: string;
  caption?: string;
  rows?: string[][];
  fields?: Record<string, string>;
}

export interface BlueprintPageContent {
  key: BlueprintModuleKey;
  title: string;
  pageId: string;
  category: BlueprintModule["category"];
  roles: Role[];
  blocks: NotionContentBlock[];
  fields: Record<string, string>;
  source: "notion";
}

export interface BlueprintUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  relationshipType: string;
  status: "active" | "pending" | "suspended";
  contactId?: string;
  membershipTier?: string;
  accessLevel?: string;
  interests?: string;
  ndaStatus?: string;
  verificationStatus?: string;
  passwordHint?: string;
  rawFields?: Record<string, string>;
  ownershipIds?: string[];
  source: "notion" | "fallback";
}

export interface SiteContentItem {
  id: string;
  title: string;
  section: string;
  description: string;
  kicker?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  sortOrder: number;
  status: string;
  tags: string[];
  rawFields: Record<string, string>;
  source: "notion";
}

export interface PortalDatabaseRow {
  id: string;
  title: string;
  fields: Record<string, string>;
  sourceTitle?: string;
}

export interface PartnerPortalSubmissionResult {
  id: string;
  title: string;
  route: string;
  status: string;
  storage: "database" | "page-fallback";
}

export interface DynamicPortalBlock extends NotionContentBlock {
  depth: number;
  children?: DynamicPortalBlock[];
  databaseRows?: PortalDatabaseRow[];
}

export interface DynamicPortalDataSection {
  key: string;
  title: string;
  description: string;
  sourceTitles: string[];
  rows: PortalDatabaseRow[];
}

export interface DynamicPortalPage {
  title: string;
  pageId: string;
  user: BlueprintUser;
  blocks: DynamicPortalBlock[];
  sections: DynamicPortalDataSection[];
  reviewRhythm: Array<{ cadence: string; focus: string }>;
  dashboardRules: string[];
  quickActions: string[];
  source: "notion";
}

const GOLD_EMBLEM_TITLE = "SBF WORLD Official Gold Emblem";
const FIELD_SEPARATOR = /^([^:]{2,80}):\s*(.+)$/;

const ADMIN_EMAILS = new Set([
  "crystal@sbfworld.com",
  "aly@sbfworld.com",
  "aly.fredricks12@gmail.com",
]);

const isAdminEmail = (email: string) => ADMIN_EMAILS.has(email.trim().toLowerCase());

export class NotionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotionConfigError";
  }
}

const NOTION_ENV_KEYS = [
  "NOTION_API_KEY",
  "NOTION_GODS_BLUEPRINT_PAGE_ID",
  "NOTION_NEW_BUILD_ZONE_PAGE_ID",
  "NOTION_SITE_CONTENT_DATA_SOURCE_ID",
  "NOTION_PORTAL_USERS_DATA_SOURCE_ID",
  "NOTION_PEOPLE_DATA_SOURCE_ID",
  "NOTION_PARTNER_INTAKE_PARENT_PAGE_ID",
  "NOTION_SUBMISSIONS_PARENT_PAGE_ID",
  "NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID",
] as const;

type NotionEnvKey = (typeof NOTION_ENV_KEYS)[number];

const optionalEnv = (key: NotionEnvKey) => {
  const value = process.env[key]?.trim();

  if (
    !value ||
    value.startsWith("replace_with_") ||
    value.toLowerCase() === "auto" ||
    value.toLowerCase().startsWith("paste_")
  ) {
    return "";
  }

  return value;
};

const requireEnv = (key: NotionEnvKey) => {
  const value = optionalEnv(key);

  if (!value) {
    throw new NotionConfigError(`${key} is not configured.`);
  }

  return value;
};

const getNotionClient = () =>
  new Client({
    auth: requireEnv("NOTION_API_KEY"),
    // A portal request reads several independent CORE sources. Do not let one
    // unreachable source hold the entire dashboard open for minutes.
    timeoutMs: 12_000,
    retry: false,
  });

const isFullBlock = (
  block: BlockObjectResponse | PartialBlockObjectResponse,
): block is BlockObjectResponse => "type" in block;

const plainText = (
  richText: Array<{ plain_text?: string }> | undefined,
) => richText?.map((item) => item.plain_text ?? "").join("").trim() ?? "";

const normalizeComparable = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const stringifyLooseNotionValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(stringifyLooseNotionValue).filter(Boolean).join(", ");
  }

  if (typeof value !== "object") return "";

  const item = value as Record<string, any>;
  if (typeof item.plain_text === "string") return item.plain_text;
  if (typeof item.name === "string") return item.name;
  if (typeof item.email === "string") return item.email;
  if (typeof item.url === "string") return item.url;
  if (typeof item.id === "string") return item.id;

  if (Array.isArray(item.title)) return plainText(item.title);
  if (Array.isArray(item.rich_text)) return plainText(item.rich_text);
  if (Array.isArray(item.multi_select)) return stringifyLooseNotionValue(item.multi_select);
  if (Array.isArray(item.people)) return stringifyLooseNotionValue(item.people);
  if (Array.isArray(item.relation)) return stringifyLooseNotionValue(item.relation);
  if (Array.isArray(item.files)) return stringifyLooseNotionValue(item.files);

  if (item.select) return stringifyLooseNotionValue(item.select);
  if (item.status) return stringifyLooseNotionValue(item.status);
  if (item.date) return stringifyLooseNotionValue(item.date.start ?? item.date);
  if (item.formula) return stringifyLooseNotionValue(item.formula[item.formula.type] ?? item.formula);
  if (item.rollup) return stringifyLooseNotionValue(item.rollup[item.rollup.type] ?? item.rollup);
  if (item.external) return stringifyLooseNotionValue(item.external.url ?? item.external);
  if (item.file) return stringifyLooseNotionValue(item.file.url ?? item.file);

  return "";
};

const normalizeRole = (value: string, fallback: Role = "member"): Role => {
  const normalized = value.toLowerCase();
  if (normalized.includes("full system") || normalized.includes("administrator") || normalized.includes(" admin") || normalized === "admin") {
    return "admin";
  }
  if (normalized.includes("partner")) return "partner";
  if (normalized.includes("lender") || normalized.includes("debt")) return "lender";
  if (normalized.includes("investor") || normalized.includes("buyer")) return "investor";
  return fallback;
};

const normalizeStatus = (value: string): BlueprintUser["status"] => {
  const normalized = value.toLowerCase();
  if (normalized.includes("suspend") || normalized.includes("blocked")) return "suspended";
  if (normalized.includes("pending") || normalized.includes("invite")) return "pending";
  return "active";
};

const blockText = (block: BlockObjectResponse) => {
  switch (block.type) {
    case "paragraph":
      return plainText(block.paragraph.rich_text);
    case "heading_1":
      return plainText(block.heading_1.rich_text);
    case "heading_2":
      return plainText(block.heading_2.rich_text);
    case "heading_3":
      return plainText(block.heading_3.rich_text);
    case "bulleted_list_item":
      return plainText(block.bulleted_list_item.rich_text);
    case "numbered_list_item":
      return plainText(block.numbered_list_item.rich_text);
    case "to_do":
      return plainText(block.to_do.rich_text);
    case "toggle":
      return plainText(block.toggle.rich_text);
    case "quote":
      return plainText(block.quote.rich_text);
    case "callout":
      return plainText(block.callout.rich_text);
    case "code":
      return plainText(block.code.rich_text);
    case "child_page":
      return block.child_page.title;
    case "child_database":
      return block.child_database.title;
    case "table_row":
      return block.table_row.cells.map((cell) => plainText(cell)).filter(Boolean).join(" | ");
    default:
      return "";
  }
};

const normalizeBlock = (block: BlockObjectResponse): NotionContentBlock | null => {
  if (block.type === "table") {
    return {
      id: block.id,
      type: block.type,
      text: "",
    };
  }

  if (block.type === "table_row") {
    const cells = block.table_row.cells.map((cell) => plainText(cell));
    return {
      id: block.id,
      type: block.type,
      text: cells.filter(Boolean).join(" | "),
      rows: [cells],
    };
  }

  if (block.type === "image") {
    const imageUrl =
      block.image.type === "external"
        ? block.image.external.url
        : block.image.file.url;

    return {
      id: block.id,
      type: block.type,
      imageUrl,
      caption: plainText(block.image.caption),
    };
  }

  const text = blockText(block);
  if (!text && block.type !== "divider") return null;

  return {
    id: block.id,
    type: block.type,
    text,
    checked: block.type === "to_do" ? block.to_do.checked : undefined,
  };
};

const extractFields = (blocks: NotionContentBlock[]) =>
  blocks.reduce<Record<string, string>>((fields, block) => {
    if (!block.text) return fields;
    const match = block.text.match(FIELD_SEPARATOR);
    if (!match) return fields;

    fields[match[1].trim().toLowerCase()] = match[2].trim();
    return fields;
  }, {});

const getField = (fields: Record<string, string>, names: string[]) => {
  for (const name of names) {
    const exact = fields[name.toLowerCase()];
    if (exact) return exact;
  }

  const entry = Object.entries(fields).find(([key]) =>
    names.some((name) => key.includes(name.toLowerCase())),
  );
  return entry?.[1] ?? "";
};

const propertyValue = (property: PageObjectResponse["properties"][string]) => {
  switch (property.type) {
    case "title":
      return plainText(property.title);
    case "rich_text":
      return plainText(property.rich_text);
    case "email":
      return property.email ?? "";
    case "phone_number":
      return property.phone_number ?? "";
    case "url":
      return property.url ?? "";
    case "number":
      return property.number?.toString() ?? "";
    case "select":
      return property.select?.name ?? "";
    case "multi_select":
      return property.multi_select.map((item) => item.name).join(", ");
    case "status":
      return property.status?.name ?? "";
    case "checkbox":
      return property.checkbox ? "Yes" : "No";
    case "date":
      return property.date?.start ?? "";
    case "people":
      return property.people
        .map((person) => ("name" in person && person.name ? person.name : person.id))
        .join(", ");
    case "relation":
      return property.relation.map((relation) => relation.id).join(", ");
    case "files":
      return property.files
        .map((file) => {
          if (file.type === "external") return file.external.url;
          if (file.type === "file") return file.file.url;
          return "";
        })
        .filter(Boolean)
        .join(", ");
    case "rollup":
      return stringifyLooseNotionValue((property.rollup as any)[property.rollup.type] ?? property.rollup);
    case "formula":
      if (property.formula.type === "string") return property.formula.string ?? "";
      if (property.formula.type === "number") return property.formula.number?.toString() ?? "";
      if (property.formula.type === "boolean") return property.formula.boolean ? "Yes" : "No";
      if (property.formula.type === "date") return property.formula.date?.start ?? "";
      return "";
    case "created_time":
      return property.created_time;
    case "last_edited_time":
      return property.last_edited_time;
    case "unique_id":
      return `${property.unique_id.prefix ?? ""}${property.unique_id.number ?? ""}`;
    default:
      return "";
  }
};

const pageProperties = (page: PageObjectResponse) =>
  Object.entries(page.properties).reduce<Record<string, string>>(
    (fields, [key, property]) => {
      const value = propertyValue(property);
      if (value) fields[key.toLowerCase()] = value;
      return fields;
    },
    {},
  );

const fieldsToLine = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");

const isPageObject = (
  item: unknown,
): item is PageObjectResponse => "properties" in (item as PageObjectResponse);

export async function getPageBlocks(pageId = requireEnv("NOTION_GODS_BLUEPRINT_PAGE_ID")) {
  const notion = getNotionClient();
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      blocks.push(...response.results.filter(isFullBlock));
      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return blocks;
  } catch (error) {
    throw new NotionConfigError(notionErrorMessage(error, `Notion page ${pageId} read`));
  }
}

async function queryDatabaseRows(databaseId: string) {
  const notion = getNotionClient();
  const rows: PageObjectResponse[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.dataSources.query({
        data_source_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });

      rows.push(...response.results.filter(isPageObject));
      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return rows;
  } catch (error) {
    throw new NotionConfigError(notionErrorMessage(error, `Notion data source ${databaseId} read`));
  }
}

const DATABASE_CACHE_TTL_MS = 120_000;
const DATABASE_STALE_TTL_MS = 15 * 60_000;
const databaseRowsCache = new Map<string, { fetchedAt: number; rows: PageObjectResponse[] }>();
const pendingDatabaseRows = new Map<string, Promise<PageObjectResponse[]>>();
let notionReadQueue: Promise<void> = Promise.resolve();

const queueNotionRead = <T>(task: () => Promise<T>) => {
  const run = notionReadQueue.catch(() => undefined).then(task);
  notionReadQueue = run.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 350)),
    () => new Promise<void>((resolve) => setTimeout(resolve, 350)),
  );
  return run;
};

async function getDatabaseRows(databaseId: string) {
  const key = stripDashes(databaseId).toLowerCase();
  const cached = databaseRowsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < DATABASE_CACHE_TTL_MS) return cached.rows;

  const pending = pendingDatabaseRows.get(key);
  if (pending) return pending;

  const request = queueNotionRead(() => queryDatabaseRows(databaseId))
    .then((rows) => {
      databaseRowsCache.set(key, { rows, fetchedAt: Date.now() });
      return rows;
    })
    .catch((error) => {
      if (cached && Date.now() - cached.fetchedAt < DATABASE_STALE_TTL_MS) return cached.rows;
      throw error;
    })
    .finally(() => pendingDatabaseRows.delete(key));

  pendingDatabaseRows.set(key, request);
  return request;
}

type NotionSearchResult = {
  object?: string;
  id?: string;
  title?: Array<{ plain_text?: string }>;
  properties?: Record<string, { type?: string; title?: Array<{ plain_text?: string }> }>;
};

const searchResultTitle = (item: NotionSearchResult) => {
  if (Array.isArray(item.title)) {
    return plainText(item.title);
  }

  const titleProperty = Object.values(item.properties ?? {}).find(
    (property) => property?.type === "title",
  );

  return plainText(titleProperty?.title);
};

const notionErrorMessage = (error: unknown, action: string) => {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("invalid") || lower.includes("api token")) {
    return `${action} failed because the Notion token is invalid or has been regenerated. Update NOTION_API_KEY in Vercel Environment Variables or local .env.local.`;
  }

  if (lower.includes("fetch failed") || lower.includes("econn") || lower.includes("enotfound") || lower.includes("network") || lower.includes("timeout")) {
    return `${action} failed because this local server could not reach Notion. Check Vercel runtime logs/network access, then test /api/deploy/health?email=brad@keatyrealestate.com.`;
  }

  return `${action} failed: ${raw}`;
};

const notionSearch = async (query: string) => {
  const searchPayload = {
    query,
    page_size: 50,
    sort: {
      direction: "descending" as const,
      timestamp: "last_edited_time" as const,
    },
  };

  try {
    const notion = getNotionClient();
    const response = await (notion as any).search(searchPayload);
    return (Array.isArray(response.results) ? response.results : []) as NotionSearchResult[];
  } catch (sdkError) {
    try {
      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireEnv("NOTION_API_KEY")}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify(searchPayload),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = typeof payload?.message === "string" ? payload.message : response.statusText;
        throw new Error(message);
      }

      return (Array.isArray(payload.results) ? payload.results : []) as NotionSearchResult[];
    } catch (rawFetchError) {
      throw new NotionConfigError(notionErrorMessage(rawFetchError, "Notion search"));
    }
  }
};

const stripDashes = (id: string) => id.replaceAll("-", "");

// Canonical data sources physically contained in
// 🏗️ New Build Zone — 8/5/2026 > 📖 God's Blueprint — CORE (Canonical).
// When the New Build Zone is enabled, portal reads must resolve through this
// allowlist and never through workspace-wide Notion search.
const NEW_BUILD_ZONE_SOURCES = [
  ["01 — Universal Intake — CORE", "a9dfefb30c674202b9898e08eb63a9b2"],
  ["02 — People, Members & Relationships — CORE", "c8ba436c18f54b4cb5dea2928c0d35e4"],
  ["03 — Partner Registry — CORE", "aba387de21e048b997b81ddb07e39e56"],
  ["04 — Investors, Buyers & Lenders — CORE", "3618e8adb5c8429988e9eebc6a0dab8d"],
  ["05 — Assets — CORE", "8ea99c20c7ce4dd9bcedad6a7b298938"],
  ["06 — Buy Boxes & Mandates — CORE", "97989f38e52246658ba14061a3927ab5"],
  ["07 — Underwriting Engine — CORE", "2bde0de3f8534aa8a46a7b7ff30be265"],
  ["08 — Matching Engine — CORE", "5d712f567d924e4888c05c2b3e9f456d"],
  ["09 — Vault & Controlled Reveal — CORE", "03a6b7a7f8014f92923b3e469b036690"],
  ["10 — Deals, LOI, PSA & Closing — CORE", "0063ee4d849d4d3baebd4363e8fe8aeb"],
  ["11 — Documents & Governance — CORE", "30cc5b53dffe4c37a4c4173c7bcf91db"],
  ["12 — Partner Submissions — CORE", "8d10e359f6d94a78aa1ee9667bdc5f19"],
  ["12 — Events & Member Access — CORE", "4930c7f86a584a6a94a69fd63a231b25"],
  ["13 — Payments, Revenue & Payouts — CORE", "1f59ebdde41e4288a1e561375943ea80"],
  ["14 — Cigar Products, Inventory & Orders — CORE", "4b56fb967b0e4f408cdd631263af5fd5"],
  ["15 — Pillar HQ Registry — CORE", "efb2afe99f864527872ce83e9968e1f7"],
] as const;

const NEW_BUILD_ZONE_PAGE_ID = "3b481791bca08167a380c1b55aafbe4a";
const NEW_BUILD_BRUCE_INVESTOR_PAGE_ID = "3b481791bca08110aa99e21d8d831d97";
const NEW_BUILD_BRAD_ASSETS_PAGE_ID = "3b681791bca081bcb193ebaffef3bedc";

const newBuildZoneEnabled = () => Boolean(optionalEnv("NOTION_NEW_BUILD_ZONE_PAGE_ID"));

const assertNewBuildZone = () => {
  const configured = stripDashes(optionalEnv("NOTION_NEW_BUILD_ZONE_PAGE_ID")).toLowerCase();
  if (configured !== NEW_BUILD_ZONE_PAGE_ID) {
    throw new NotionConfigError("Portal reads require the canonical New Build Zone — 8/5/2026 page ID.");
  }
};

const canonicalBradInvestorRows = async (): Promise<PortalDatabaseRow[]> => {
  assertNewBuildZone();
  const blocks = await getPageBlocks(NEW_BUILD_BRUCE_INVESTOR_PAGE_ID);
  const lines = blocks.map(blockText).filter(Boolean);
  const notion = getNotionClient();
  const tables = blocks.filter((block) => block.type === "table");
  const readTable = async (block: BlockObjectResponse | undefined) => {
    if (!block) return [] as string[][];
    const response = await notion.blocks.children.list({ block_id: block.id, page_size: 100 });
    return response.results.flatMap((item) => {
      if (!isFullBlock(item) || item.type !== "table_row") return [];
      return [item.table_row.cells.map((cell) => plainText(cell))];
    });
  };
  const [profileTable, buyBoxTable, matchesTable] = await Promise.all([
    readTable(tables[0]), readTable(tables[1]), readTable(tables[2]),
  ]);
  const profile = Object.fromEntries(profileTable.slice(1).filter((row) => row[0]).map((row) => [row[0], row[1] ?? ""]));
  const buyBox = Object.fromEntries(buyBoxTable.slice(1).filter((row) => row[0]).map((row) => [row[0], row[1] ?? ""]));
  const matches = matchesTable.slice(1).filter((row) => row[0]).map((row, index) => ({
    id: `new-build-bruce-match-${index + 1}`,
    title: row[0],
    fields: { "match score": row[1] ?? "", price: row[2] ?? "", units: row[3] ?? "", status: row[4] ?? "" },
  }));
  const valueAfter = (label: string) => {
    const line = lines.find((item) => normalizeComparable(item).startsWith(normalizeComparable(label)));
    return line?.slice(line.indexOf(":") + 1).trim() ?? "";
  };
  return [{
    id: NEW_BUILD_BRUCE_INVESTOR_PAGE_ID,
    title: "Bruce Edwards",
    sourceTitle: "New Build Zone — Bruce Edwards Investor Portal (Canonical)",
    fields: {
      "investor name": "Bruce Edwards",
      organization: profile.Organization || valueAfter("Organization") || "Eden Elevations 3",
      status: valueAfter("Status") || "Active — Canonical Investor Portal",
      lane: valueAfter("Lane") || "Investor Lane",
      "registry id": profile["Registry ID"] || valueAfter("Registry ID") || "SBF-INV-INS-001",
      "capital id": profile["Capital ID (CORE)"] || valueAfter("Capital ID") || "8",
      email: profile.Email || "bruce@edenelevations3.com",
      "capital role": profile["Capital Role"] || "Investor / Buyer — Institutional",
      "capital capacity": profile["Capital Capacity"] || "$100,000,000",
      "asset classes": profile["Asset Classes"] || "Multifamily",
      "geographic focus": profile["Geographic Focus"] || "National USA — Sun Belt and Midwest",
      "source partner": profile["Source Partner"] || "Brad Gaubert — Keaty Real Estate",
      "buy box": valueAfter("Buy Box Name") || "Bruce Edwards Buy Box Tracker — Multifamily Acquisitions",
      "buy box status": valueAfter("Status") || "Active — Match Ready",
      "nda status": "Needed",
      "proof of funds status": "Needed",
      "portal access": "Locked pending activation checklist",
      "canonical source page": NEW_BUILD_BRUCE_INVESTOR_PAGE_ID,
      "buy box criteria": JSON.stringify(buyBox),
      "active matches": JSON.stringify(matches),
    },
  }];
};

const fieldsFromNewBuildCode = (value: string) => Object.fromEntries(
  value.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^:]{2,80}):\s*(.*)$/);
    return match ? [[match[1].trim().toLowerCase(), match[2].trim()]] : [];
  }),
);

const canonicalBradAssetRows = async (): Promise<PortalDatabaseRow[]> => {
  assertNewBuildZone();
  const blocks = await getPageBlocks(NEW_BUILD_BRAD_ASSETS_PAGE_ID);
  return blocks.flatMap((block, index) => {
    if (block.type !== "code") return [];
    const fields = fieldsFromNewBuildCode(plainText(block.code.rich_text));
    if (normalizeComparable(fields["submission type"]) !== "asset") return [];
    const title = fields["asset / opportunity name"] || fields["submission name"];
    if (!title || normalizeComparable(fields["source partner name"]) !== "brad gaubert") return [];
    return [{
      id: `new-build-brad-asset-${fields["asset registry id"] || index + 1}`,
      title,
      sourceTitle: "New Build Zone — Brad's 10 Assets (Canonical)",
      fields: { ...fields, "canonical source page": NEW_BUILD_BRAD_ASSETS_PAGE_ID },
    } satisfies PortalDatabaseRow];
  });
};

const canonicalNewBuildSectionsForUser = async (user: BlueprintUser): Promise<DynamicPortalDataSection[]> => {
  const investorRows = await canonicalBradInvestorRows();
  const investor = investorRows[0];
  const buyBoxFields = JSON.parse(investor.fields["buy box criteria"] || "{}") as Record<string, string>;
  const matchRows = (JSON.parse(investor.fields["active matches"] || "[]") as Array<{
    id: string; title: string; fields: Record<string, string>;
  }>).map((row) => ({ ...row, sourceTitle: investor.sourceTitle }));
  const isBruce = normalizeComparable(user.email) === "bruce edenelevations3 com";
  const bradAssets = await canonicalBradAssetRows();
  const bruceAssets: PortalDatabaseRow[] = matchRows.map((match) => ({
    id: `${match.id}-asset`,
    title: match.title,
    sourceTitle: "New Build Zone — Bruce Edwards Investor Portal (Canonical)",
    fields: { ...match.fields, "related investor": "Bruce Edwards", "source partner": "Brad Gaubert" },
  }));
  const assets: PortalDatabaseRow[] = isBruce ? bruceAssets : bradAssets;
  return [
    { key: "assets", title: "New Build Zone — Assets", description: "Canonical owner-scoped New Build records.", sourceTitles: [NEW_BUILD_BRAD_ASSETS_PAGE_ID], rows: assets },
    { key: "complete-assets", title: "Complete Assets", description: "Founder-approved New Build assets.", sourceTitles: [NEW_BUILD_BRAD_ASSETS_PAGE_ID], rows: assets.filter((row) => /approved/i.test(row.fields["founder approval"] || "") || isBruce) },
    { key: "investors", title: "New Build Zone — Investors", description: "Brad-scoped canonical investor.", sourceTitles: [NEW_BUILD_BRUCE_INVESTOR_PAGE_ID], rows: investorRows },
    { key: "buy-box-signals", title: "New Build Zone — Buy Boxes", description: "Bruce Edwards canonical mandate.", sourceTitles: [NEW_BUILD_BRUCE_INVESTOR_PAGE_ID], rows: [{ id: `${investor.id}-buy-box`, title: investor.fields["buy box"] || "Bruce Edwards Buy Box", sourceTitle: investor.sourceTitle, fields: buyBoxFields }] },
    { key: "active-matches", title: "New Build Zone — Active Matches", description: "Bruce Edwards canonical match pipeline.", sourceTitles: [NEW_BUILD_BRUCE_INVESTOR_PAGE_ID], rows: matchRows },
    { key: "underwritten-assets", title: "New Build Zone — Underwriting", description: "NDA-gated canonical underwriting status.", sourceTitles: [NEW_BUILD_BRUCE_INVESTOR_PAGE_ID], rows: assets.map((asset) => ({ id: `nda-gated-${asset.id}`, title: asset.title, sourceTitle: asset.sourceTitle, fields: { status: asset.fields["underwriting status"] || asset.fields.status || "NDA gated", access: "NDA required — protected fields excluded" } })) },
    { key: "submissions", title: "New Build Zone — Submissions", description: "Brad's canonical New Build submissions.", sourceTitles: [NEW_BUILD_BRAD_ASSETS_PAGE_ID], rows: isBruce ? [] : bradAssets },
    { key: "documents", title: "New Build Zone — Documents", description: "Documents remain controlled by the canonical gating workflow.", sourceTitles: [NEW_BUILD_BRUCE_INVESTOR_PAGE_ID], rows: [] },
  ];
};

const newBuildSourceForTitle = (title: string) => {
  const requested = normalizeComparable(title);
  const scored = NEW_BUILD_ZONE_SOURCES.map(([sourceTitle, id]) => {
    const canonical = normalizeComparable(sourceTitle);
    let score = canonical === requested ? 100 : 0;
    if (requested.includes(canonical) || canonical.includes(requested)) score += 50;
    requested.split(" ").forEach((word) => {
      if (word.length > 3 && canonical.includes(word)) score += 2;
    });
    return { id, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.score > 3 ? scored[0].id : "";
};

let portalUsersDataSourceIdPromise: Promise<string> | null = null;

const getPortalUsersDataSourceId = async () => {
  if (newBuildZoneEnabled()) return "";
  const configured = optionalEnv("NOTION_PORTAL_USERS_DATA_SOURCE_ID");
  if (configured) return configured;

  portalUsersDataSourceIdPromise ??= notionSearch("SBF WORLD Portal Users")
    .then((results) => {
      const exact = results.find(
        (item) =>
          item.object === "data_source" &&
          searchResultTitle(item).toLowerCase() === "sbf world portal users",
      );

      const fuzzy = results.find(
        (item) =>
          item.object === "data_source" &&
          searchResultTitle(item).toLowerCase().includes("portal users"),
      );

      const id = stripDashes((exact ?? fuzzy)?.id ?? "");
      if (!id) portalUsersDataSourceIdPromise = null;
      return id;
    })
    .catch((error) => {
      portalUsersDataSourceIdPromise = null;
      throw error;
    });

  return portalUsersDataSourceIdPromise;
};

let peopleDataSourceIdPromise: Promise<string> | null = null;

const getPeopleDataSourceId = async () => {
  if (newBuildZoneEnabled()) return newBuildSourceForTitle("02 — People, Members & Relationships — CORE");
  const configured = optionalEnv("NOTION_PEOPLE_DATA_SOURCE_ID");
  if (configured) return configured;

  peopleDataSourceIdPromise ??= (async () => {
    const queries = [
      "02 People Members Relationships CORE",
      "People Members Relationships",
      "Relationships CORE",
      "All People",
      "People",
    ];

    const settled = await Promise.allSettled(queries.map((query) => notionSearch(query)));
    const results = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const seen = new Set<string>();
    const unique = results.filter((item) => {
      const id = stripDashes(item.id ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const score = (item: NotionSearchResult) => {
      if (item.object !== "data_source") return -1;
      const title = normalizeComparable(searchResultTitle(item));
      let points = 0;
      if (title.includes("people")) points += 4;
      if (title.includes("members")) points += 4;
      if (title.includes("relationships")) points += 4;
      if (title.includes("core")) points += 2;
      if (title.startsWith("02")) points += 1;
      return points;
    };

    const best = unique
      .map((item) => ({ item, score: score(item) }))
      .filter((entry) => entry.score >= 8)
      .sort((a, b) => b.score - a.score)[0]?.item;

    const id = stripDashes(best?.id ?? "");
    if (!id) peopleDataSourceIdPromise = null;
    return id;
  })().catch((error) => {
    peopleDataSourceIdPromise = null;
    throw error;
  });

  return peopleDataSourceIdPromise;
};


let partnerSubmissionsDataSourceIdPromise: Promise<string> | null = null;

const getPartnerSubmissionsDataSourceId = async () => {
  if (newBuildZoneEnabled()) return newBuildSourceForTitle("12 — Partner Submissions — CORE");
  const configured = optionalEnv("NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID");
  if (configured && !/^(auto|discover|search|none|null)$/i.test(configured)) return configured;

  partnerSubmissionsDataSourceIdPromise ??= (async () => {
    const queries = [
      "Partner Submissions CORE",
      "Partner Submissions",
      "Submissions CORE",
      "SBF WORLD Partner Submissions",
    ];

    const settled = await Promise.allSettled(queries.map((query) => notionSearch(query)));
    const results = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const scored = results
      .filter((item) => item.object === "data_source")
      .map((item) => {
        const title = normalizeComparable(searchResultTitle(item));
        let score = 0;
        if (title.includes("partner")) score += 5;
        if (title.includes("submissions")) score += 8;
        if (title.includes("core")) score += 3;
        if (title.includes("sbf world")) score += 1;
        return { item, score };
      })
      .filter((entry) => entry.score >= 8)
      .sort((a, b) => b.score - a.score);

    const id = stripDashes(scored[0]?.item.id ?? "");
    if (!id) partnerSubmissionsDataSourceIdPromise = null;
    return id;
  })().catch((error) => {
    partnerSubmissionsDataSourceIdPromise = null;
    throw error;
  });

  return partnerSubmissionsDataSourceIdPromise;
};

async function getDatabaseBlocks(blocks: BlockObjectResponse[]) {
  const databaseBlocks = blocks.filter((block) => block.type === "child_database");
  const settled = await Promise.allSettled(
    databaseBlocks.map(async (block) => {
      const rows = await getDatabaseRows(block.id);
      const normalizedRows = rows.map(pageProperties);

      return {
        id: block.id,
        type: "database",
        text: block.child_database.title,
        rows: normalizedRows.map((row) => Object.values(row)),
        fields: {
          title: block.child_database.title,
          record_count: String(normalizedRows.length),
        },
        databaseRows: normalizedRows,
      };
    }),
  );

  const fulfilled: Array<NotionContentBlock & { databaseRows: Record<string, string>[] }> = [];

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      fulfilled.push(result.value);
    }
  });

  return fulfilled;
}

export async function getBlueprintPage(module: BlueprintModule): Promise<BlueprintPageContent> {
  const rawBlocks = await getPageBlocks(module.pageId);
  const blocks = rawBlocks.map(normalizeBlock).filter((block): block is NotionContentBlock => Boolean(block));
  const databaseBlocks = await getDatabaseBlocks(rawBlocks);

  return {
    key: module.key,
    title: module.title,
    pageId: module.pageId,
    category: module.category,
    roles: module.roles,
    blocks: [...blocks, ...databaseBlocks],
    fields: extractFields([...blocks, ...databaseBlocks]),
    source: "notion",
  };
}

export async function getBlueprintPagesForRole(role: Role) {
  const modules = modulesForRole(role);
  const pages = await Promise.allSettled(modules.map(getBlueprintPage));

  return pages.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    const module = modules[index];
    return {
      key: module.key,
      title: module.title,
      pageId: module.pageId,
      category: module.category,
      roles: module.roles,
      blocks: [],
      fields: {},
      source: "notion" as const,
    };
  });
}

export async function getAllBlueprintPages() {
  const pages = await Promise.allSettled(BLUEPRINT_MODULES.map(getBlueprintPage));
  return pages.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    const module = BLUEPRINT_MODULES[index];
    return {
      key: module.key,
      title: module.title,
      pageId: module.pageId,
      category: module.category,
      roles: module.roles,
      blocks: [],
      fields: {},
      source: "notion" as const,
    };
  });
}

const splitList = (value: string) =>
  value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const pageCoverUrl = (page: PageObjectResponse) => {
  if (!page.cover) return "";
  if (page.cover.type === "external") return page.cover.external.url;
  return page.cover.file.url;
};

const isPublicSiteContent = (fields: Record<string, string>) => {
  const status = getField(fields, ["status", "state", "visibility", "publish", "published"]);
  if (!status) return true;

  const normalized = status.toLowerCase();
  if (["no", "false", "draft", "hidden", "private", "archive", "archived"].some((item) => normalized.includes(item))) {
    return false;
  }

  return true;
};

const normalizeSiteContentItem = (page: PageObjectResponse): SiteContentItem | null => {
  const fields = pageProperties(page);
  const title = getField(fields, ["title", "name", "headline", "heading"]);

  if (!title) return null;

  const sortOrderValue = getField(fields, ["order", "sort", "position", "rank"]);
  const sortOrder = Number.parseFloat(sortOrderValue);

  return {
    id: page.id,
    title,
    section: getField(fields, ["section", "type", "category", "group"]) || "Notion CMS",
    description: getField(fields, ["description", "summary", "body", "content", "text"]),
    kicker: getField(fields, ["kicker", "label", "eyebrow", "subtitle"]),
    ctaLabel: getField(fields, ["button label", "cta label", "link label", "action"]),
    ctaUrl: getField(fields, ["button url", "cta url", "url", "link", "website"]),
    imageUrl: getField(fields, ["image", "image url", "cover", "thumbnail", "photo"]) || pageCoverUrl(page),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
    status: getField(fields, ["status", "state", "visibility", "publish", "published"]) || "Published",
    tags: splitList(getField(fields, ["tags", "tag", "pillars", "labels"])),
    rawFields: fields,
    source: "notion",
  };
};

export async function getSiteContentItems(): Promise<SiteContentItem[]> {
  const dataSourceId = requireEnv("NOTION_SITE_CONTENT_DATA_SOURCE_ID");
  const rows = await getDatabaseRows(dataSourceId);

  return rows
    .map(normalizeSiteContentItem)
    .filter((item): item is SiteContentItem => Boolean(item))
    .filter((item) => isPublicSiteContent(item.rawFields))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

const normalizePortalUserRow = (fields: Record<string, string>, id: string): BlueprintUser | null => {
  const rowText = fieldsToLine(fields);
  const normalizedRowText = normalizeComparable(rowText);
  const email = (
    getField(fields, [
      "email",
      "e-mail",
      "mail",
      "login email",
      "contact email",
      "owner email",
      "primary email",
      "email address",
    ]) ||
    rowText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!email) return null;

  const relationshipType = getField(fields, [
    "relationship type",
    "relationship",
    "profile",
    "type",
    "role",
    "portal access",
  ]);
  const accessLevel = getField(fields, ["access level", "portal access", "portal", "access"]);
  const membershipTier = getField(fields, ["membership tier", "tier", "membership"]);
  const roleText = [
    getField(fields, ["role", "portal role", "access profile", "portal type"]),
    accessLevel,
    relationshipType,
    membershipTier,
  ]
    .filter(Boolean)
    .join(" | ");

  const inferredRole = normalizeRole(roleText || rowText);
  const statusText = getField(fields, ["status", "approval", "access status", "portal status"]) || "Active";

  return {
    id,
    name:
      getField(fields, ["name", "full name", "member", "partner", "contact", "owner", "owner / contact"]) ||
      email,
    email,
    role: inferredRole,
    relationshipType: relationshipType || accessLevel || "Portal User",
    status: normalizeStatus(statusText),
    contactId: getField(fields, ["contact id", "id", "member id"]),
    membershipTier,
    accessLevel,
    interests: getField(fields, ["interests", "interest", "sector", "sectors", "pillars"]),
    ndaStatus: getField(fields, ["nda status", "nda"]),
    verificationStatus: getField(fields, ["verification status", "verification", "verified"]),
    passwordHint: getField(fields, ["access code", "password", "portal code", "code"]),
    rawFields: fields,
    source: "notion" as const,
  };
};

export async function getPeopleUsersFromDataSource(): Promise<BlueprintUser[]> {
  const dataSourceId = await getPeopleDataSourceId();
  if (!dataSourceId) return [];

  const rows = await getDatabaseRows(dataSourceId);

  return rows
    .map((page) => normalizePortalUserRow(pageProperties(page), page.id))
    .filter((user): user is BlueprintUser => Boolean(user));
}

export async function getPortalUsersFromDataSource(): Promise<BlueprintUser[]> {
  const dataSourceId = await getPortalUsersDataSourceId();
  if (!dataSourceId) return [];

  const rows = await getDatabaseRows(dataSourceId);

  return rows
    .map((page) => normalizePortalUserRow(pageProperties(page), page.id))
    .filter((user): user is BlueprintUser => Boolean(user));
}

const attachNewBuildOwnershipIds = async (user: BlueprintUser): Promise<BlueprintUser> => {
  if (!newBuildZoneEnabled() || user.role === "admin") return user;
  // Only Partner Registry rows represent ownership identities. Investor rows may
  // mention a partner in notes/relationships, but their page IDs must never be
  // treated as partner owner IDs or unrelated assets will leak into the scope.
  const sourceTitles = ["03 — Partner Registry — CORE"];
  const settled = await Promise.allSettled(
    sourceTitles.map((title) => getDatabaseRows(newBuildSourceForTitle(title))),
  );
  const email = normalizeComparable(user.email);
  const name = normalizeComparable(user.name);
  const ownershipIds = settled.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
          .filter((page) => {
            const text = normalizeComparable(fieldsToLine(pageProperties(page)));
            return (email && text.includes(email)) || (name && text.includes(name));
          })
          .map((page) => page.id)
      : [],
  );
  return { ...user, ownershipIds };
};

export async function getBlueprintUsers(): Promise<BlueprintUser[]> {
  const userModules = BLUEPRINT_MODULES.filter((module) =>
    ["people-members-relationships", "partner-registry", "investors-buyers-lenders"].includes(module.key),
  );
  const pages = await Promise.allSettled(userModules.map(getBlueprintPage));

  return pages.flatMap<BlueprintUser>((page, pageIndex) => {
    if (page.status !== "fulfilled") return [];

    const users: BlueprintUser[] = [];

    page.value.blocks.forEach((block, index) => {
      const databaseRows =
        "databaseRows" in block && Array.isArray(block.databaseRows)
          ? (block.databaseRows as Record<string, string>[])
          : [];
      const candidates = databaseRows.length
        ? databaseRows.map((fields) => ({ text: fieldsToLine(fields), fields }))
        : [{ text: block.text ?? "", fields: { ...page.value.fields, ...(block.fields ?? {}) } }];

      candidates
        .filter((candidate) => /@/.test(candidate.text))
        .forEach((candidate, candidateIndex) => {
          const text = candidate.text;
          const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
          if (!email) return;
          const fallbackRole = userModules[pageIndex].key === "partner-registry" ? "partner" : "member";
          const fields = candidate.fields;

          users.push({
            id: `${userModules[pageIndex].key}-${index}-${candidateIndex}`,
            name: getField(fields, ["name", "full name", "member", "partner", "contact"]) || text.split(email)[0].replace(/[-|,]/g, "").trim() || email,
            email: email.toLowerCase(),
            role: normalizeRole(`${text} ${getField(fields, ["role", "relationship type", "relationship", "profile"])}`, fallbackRole),
            relationshipType: getField(fields, ["relationship type", "relationship", "profile", "type", "role"]) || page.value.title,
            status: normalizeStatus(`${text} ${getField(fields, ["status", "approval", "access"])}`),
            passwordHint: getField(fields, ["password", "access code", "portal code"]),
            source: "notion" as const,
          });
        });
    });

    return users;
  });
}

export async function getNotionPortalDiagnostics(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const token = optionalEnv("NOTION_API_KEY");
  const blueprintPageId = optionalEnv("NOTION_GODS_BLUEPRINT_PAGE_ID");

  const report: {
    tokenConfigured: boolean;
    blueprintPageConfigured: boolean;
    peopleDataSourceId?: string;
    portalUsersDataSourceId?: string;
    peopleCount: number;
    portalUsersCount: number;
    matchedUser?: BlueprintUser;
    errors: string[];
  } = {
    tokenConfigured: Boolean(token),
    blueprintPageConfigured: Boolean(blueprintPageId),
    peopleCount: 0,
    portalUsersCount: 0,
    errors: [],
  };

  try {
    report.peopleDataSourceId = await getPeopleDataSourceId();
  } catch (error) {
    report.errors.push(notionErrorMessage(error, "People data source lookup"));
  }

  try {
    report.portalUsersDataSourceId = await getPortalUsersDataSourceId();
  } catch (error) {
    report.errors.push(notionErrorMessage(error, "Portal users data source lookup"));
  }

  try {
    const people = await getPeopleUsersFromDataSource();
    report.peopleCount = people.length;
    if (normalizedEmail) report.matchedUser = people.find((user) => user.email === normalizedEmail);
  } catch (error) {
    report.errors.push(notionErrorMessage(error, "People table read"));
  }

  try {
    const portalUsers = await getPortalUsersFromDataSource();
    report.portalUsersCount = portalUsers.length;
    if (normalizedEmail && !report.matchedUser) {
      report.matchedUser = portalUsers.find((user) => user.email === normalizedEmail);
    }
  } catch (error) {
    report.errors.push(notionErrorMessage(error, "Portal users table read"));
  }

  return report;
}

export async function findApprovedPortalUser(email: string, requestedRole?: Role) {
  const normalizedEmail = email.trim().toLowerCase();
  const identityReads = await Promise.allSettled([
    getPeopleUsersFromDataSource(),
    getPortalUsersFromDataSource(),
    getBlueprintUsers(),
  ]);
  const users = identityReads.flatMap((result) => result.status === "fulfilled" ? result.value : []);

  // Brad's partner portal is an approved New Build Zone route. Keep login
  // available when the replacement token intentionally cannot access the
  // legacy People data source; authorization remains partner-scoped.
  if (newBuildZoneEnabled() && normalizedEmail === "brad@keatyrealestate.com") {
    users.unshift({
      id: "new-build-brad-partner",
      name: "Brad Gaubert",
      email: normalizedEmail,
      role: "partner",
      relationshipType: "Partner, Member, Broker",
      status: "active",
      membershipTier: "Partner",
      accessLevel: "Partner Portal",
      verificationStatus: "Verified",
      rawFields: { "canonical source": "New Build Zone — 8/5/2026" },
      source: "notion",
    });
  }
  if (newBuildZoneEnabled() && normalizedEmail === "bruce@edenelevations3.com") {
    users.unshift({
      id: NEW_BUILD_BRUCE_INVESTOR_PAGE_ID,
      name: "Bruce Edwards",
      email: normalizedEmail,
      role: "investor",
      relationshipType: "Investor / Buyer — Institutional",
      status: "active",
      membershipTier: "Investor",
      accessLevel: "Investor Portal",
      verificationStatus: "Verified",
      ndaStatus: "Needed",
      rawFields: { "canonical source": "New Build Zone — Bruce Edwards Investor Portal" },
      source: "notion",
    });
  }

  const matches = users.filter((candidate) => candidate.email === normalizedEmail);

  if (isAdminEmail(normalizedEmail)) {
    const matchedAdmin = matches.find((candidate) => candidate.status === "active") ?? matches[0];
    return {
      id: matchedAdmin?.id ?? `admin-${normalizedEmail}`,
      name: matchedAdmin?.name || (normalizedEmail.startsWith("crystal") ? "Crystal Poe" : "Aly SBF WORLD"),
      email: normalizedEmail,
      role: "admin" as Role,
      relationshipType: "Administrator",
      status: "active" as const,
      contactId: matchedAdmin?.contactId,
      membershipTier: matchedAdmin?.membershipTier || "Admin",
      accessLevel: "Full System Access",
      interests: matchedAdmin?.interests,
      ndaStatus: matchedAdmin?.ndaStatus,
      verificationStatus: matchedAdmin?.verificationStatus || "Verified",
      passwordHint: matchedAdmin?.passwordHint,
      rawFields: matchedAdmin?.rawFields ?? {},
      source: "notion" as const,
    };
  }

  if (!matches.length) return null;

  const activeMatches = matches.filter((candidate) => candidate.status === "active");
  if (!activeMatches.length) return null;

  // Notion is the source of truth. The selected button on the login screen should not
  // block a valid user when their row already contains the correct profile.
  // We still prefer the exact selected role when Notion clearly provides it.
  const exactRoleMatch = requestedRole
    ? activeMatches.find((candidate) => candidate.role === requestedRole)
    : undefined;

  return attachNewBuildOwnershipIds(exactRoleMatch ?? activeMatches[0]);
}

export async function authenticateBlueprintUser(email: string, password?: string, requestedRole?: Role) {
  const enteredPassword = password?.trim() ?? "";
  const user = await findApprovedPortalUser(email, requestedRole);

  if (!user) return null;
  if (user.passwordHint && user.passwordHint.trim() !== enteredPassword) return null;

  return user;
}

export function extractGoldEmblemBlock(blocks: BlockObjectResponse[]): GoldEmblemData | null {
  const imageBlocks = blocks.filter((block) => block.type === "image");

  const selected =
    imageBlocks.find((block) => {
      const caption = plainText(block.image.caption);
      return caption.toLowerCase().includes(GOLD_EMBLEM_TITLE.toLowerCase());
    }) ?? imageBlocks[0];

  if (!selected || selected.type !== "image") {
    return null;
  }

  const imageUrl =
    selected.image.type === "external"
      ? selected.image.external.url
      : selected.image.file.url;
  const caption = plainText(selected.image.caption) || GOLD_EMBLEM_TITLE;

  return {
    title: caption,
    type: "image",
    imageUrl,
    caption,
    source: "notion",
  };
}

export async function getGoldEmblem() {
  const blocks = await getPageBlocks();
  return extractGoldEmblemBlock(blocks);
}

const titleFromFields = (fields: Record<string, string>) =>
  getField(fields, ["title", "name", "full name", "portal", "page", "item", "asset", "buy box", "mandate"]) ||
  Object.values(fields).find(Boolean) ||
  "Untitled";

const rolePortalTitle = (role: Role) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "investor":
      return "Investor";
    case "partner":
      return "Partner";
    case "lender":
      return "Lender";
    case "member":
    default:
      return "Member";
  }
};

const firstNameOf = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .split(/\s+/)
    .find(Boolean) ?? name;

const usefulPortalTitle = (value: string) => {
  const cleaned = value.trim();
  const normalized = normalizeComparable(cleaned);
  if (!cleaned || !normalized.includes("portal")) return "";
  if (["portal", "no access", "internal", "external"].includes(normalized)) return "";
  if (normalized.includes("http")) return "";
  return cleaned;
};

let dataSourceTitleCache: Promise<NotionSearchResult[]> | null = null;

const allSharedSearchResults = async () => {
  dataSourceTitleCache ??= (async () => {
    const queries = ["SBF WORLD", "CORE", "Portal", "Brad", "Buy Box", "Buy Boxes", "Mandates", "Investors", "Buyers", "Lenders", "Assets", "Underwriting", "Matching Engine"];
    const settled = await Promise.allSettled(queries.map((query) => notionSearch(query)));
    const seen = new Set<string>();
    return settled
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .filter((item) => {
        const id = stripDashes(item.id ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  })();

  return dataSourceTitleCache;
};

const resolveDataSourceIdByTitle = async (title: string) => {
  const normalizedTitle = normalizeComparable(title);
  if (!normalizedTitle) return "";
  if (newBuildZoneEnabled()) return newBuildSourceForTitle(title);

  const results = [
    ...(await notionSearch(title).catch(() => [])),
    ...(await allSharedSearchResults().catch(() => [])),
  ];

  const scored = results
    .filter((item) => item.object === "data_source")
    .map((item) => {
      const itemTitle = searchResultTitle(item);
      const normalized = normalizeComparable(itemTitle);
      let score = 0;
      if (normalized === normalizedTitle) score += 100;
      if (normalized.includes(normalizedTitle)) score += 60;
      if (normalizedTitle.includes(normalized)) score += 20;
      normalizedTitle.split(" ").forEach((word) => {
        if (word.length > 2 && normalized.includes(word)) score += 3;
      });
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return stripDashes(scored[0]?.item.id ?? "");
};

const databaseRowsForTitleOrId = async (title: string, blockId: string, user: BlueprintUser) => {
  const candidates = [stripDashes(blockId), await resolveDataSourceIdByTitle(title)];
  for (const dataSourceId of candidates.filter(Boolean)) {
    try {
      const rows = await getDatabaseRows(dataSourceId);
      return toPortalRows(rows, title, user, isCoreOrSharedSource(title));
    } catch {
      // Try the next candidate. Notion child_database block IDs are not always queryable data_source IDs.
    }
  }

  return [];
};

const dynamicFromBlock = async (
  block: BlockObjectResponse,
  depth: number,
  seen: Set<string>,
  user: BlueprintUser,
): Promise<DynamicPortalBlock | null> => {
  const normalized = normalizeBlock(block) ?? {
    id: block.id,
    type: block.type,
    text: blockText(block),
  };

  const portalBlock: DynamicPortalBlock = {
    ...normalized,
    depth,
  };

  if (block.type === "child_database") {
    portalBlock.text = block.child_database.title;
    portalBlock.databaseRows = await databaseRowsForTitleOrId(block.child_database.title, block.id, user);
    portalBlock.fields = {
      ...(portalBlock.fields ?? {}),
      title: block.child_database.title,
      record_count: String(portalBlock.databaseRows.length),
    };
  }

  if (block.type === "child_page") {
    portalBlock.text = block.child_page.title;
  }

  if ("has_children" in block && block.has_children && depth < 5 && !seen.has(block.id)) {
    seen.add(block.id);
    try {
      const children = await getPageBlocks(block.id);
      const childBlocks = await Promise.all(
        children.map((child) => dynamicFromBlock(child, depth + 1, seen, user)),
      );
      portalBlock.children = childBlocks.filter((child): child is DynamicPortalBlock => Boolean(child));
    } catch {
      portalBlock.children = [];
    }
  }

  if (
    !portalBlock.text &&
    !portalBlock.imageUrl &&
    !portalBlock.databaseRows?.length &&
    !portalBlock.children?.length &&
    portalBlock.type !== "divider"
  ) {
    return null;
  }

  return portalBlock;
};

const getDynamicBlocksForPage = async (pageId: string, user: BlueprintUser) => {
  const rawBlocks = await getPageBlocks(pageId);
  const blocks = await Promise.all(rawBlocks.map((block) => dynamicFromBlock(block, 0, new Set(), user)));
  return blocks.filter((block): block is DynamicPortalBlock => Boolean(block));
};

const portalSectionKeyForSource = (title: string) => {
  const value = normalizeComparable(title);
  if (value.includes("underwriting")) return "underwritten-assets";
  if (value.includes("investor") || value.includes("buyer") || value.includes("lender")) return "investors";
  if (value.includes("buy box") || value.includes("mandate")) return "buy-box-signals";
  if (value.includes("match") || value.includes("deal flow")) return "active-matches";
  if (value.includes("asset") || value.includes("vault")) return "assets";
  return "";
};

const sectionsFromPortalBlocks = (blocks: DynamicPortalBlock[]): DynamicPortalDataSection[] => {
  const buckets = new Map<string, DynamicPortalDataSection>();
  const visit = (items: DynamicPortalBlock[]) => items.forEach((block) => {
    if (block.databaseRows) {
      const sourceTitle = block.text || block.fields?.title || "Partner Portal — Brad";
      const key = portalSectionKeyForSource(sourceTitle);
      if (key) {
        const current = buckets.get(key) ?? {
          key,
          title: sourceTitle,
          description: "Live records sourced only from Partner Portal — Brad.",
          sourceTitles: [],
          rows: [],
        };
        current.sourceTitles = Array.from(new Set([...current.sourceTitles, sourceTitle]));
        current.rows = uniquePortalRows([...current.rows, ...block.databaseRows]);
        buckets.set(key, current);
      }
    }
    if (block.children?.length) visit(block.children);
  });
  visit(blocks);
  return Array.from(buckets.values());
};

const findPortalPageForUser = async (user: BlueprintUser) => {
  const fields = user.rawFields ?? {};
  const configuredPortalTitles = [
    getField(fields, ["portal page", "assigned portal", "dashboard page", "dashboard", "portal dashboard"]),
    getField(fields, ["partner portal", "member portal", "investor portal", "lender portal", "admin portal"]),
    getField(fields, ["portal", "portal access", "login url", "portal url"]),
  ]
    .map(usefulPortalTitle)
    .filter(Boolean);

  const fullName = user.name.trim();
  const firstName = firstNameOf(fullName);
  const roleTitle = rolePortalTitle(user.role);
  const titleCandidates = [
    ...configuredPortalTitles,
    `${roleTitle} Portal — ${firstName}`,
    `${roleTitle} Portal - ${firstName}`,
    `${roleTitle} Portal – ${firstName}`,
    `${roleTitle} Portal ${firstName}`,
    `${roleTitle} Portal — ${fullName}`,
    `${roleTitle} Portal - ${fullName}`,
    `${roleTitle} Portal`,
  ].filter(Boolean);

  const settled = await Promise.allSettled(titleCandidates.map((query) => notionSearch(query)));
  const seen = new Set<string>();
  const results = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      const id = stripDashes(item.id ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

  const normalizedFirst = normalizeComparable(firstName);
  const normalizedFull = normalizeComparable(fullName);
  const normalizedRole = normalizeComparable(roleTitle);

  const scored = results
    .filter((item) => item.object === "page")
    .map((item) => {
      const title = searchResultTitle(item);
      const normalized = normalizeComparable(title);
      let score = 0;
      titleCandidates.forEach((candidate) => {
        const normalizedCandidate = normalizeComparable(candidate);
        if (normalized === normalizedCandidate) score += 100;
        if (normalized.includes(normalizedCandidate)) score += 50;
      });
      if (normalized.includes("portal")) score += 12;
      if (normalized.includes(normalizedRole)) score += 12;
      if (normalizedFirst && normalized.includes(normalizedFirst)) score += 25;
      if (normalizedFull && normalized.includes(normalizedFull)) score += 30;
      if (normalized.includes("template")) score -= 80;
      if (normalized.includes("sovereign") && !normalized.includes(normalizedFirst)) score -= 20;
      return { item, title, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best?.item.id) return null;

  return {
    id: stripDashes(best.item.id),
    title: best.title || `${roleTitle} Portal — ${firstName}`,
  };
};


const identityTokensForUser = (user: BlueprintUser) =>
  [
    user.email,
    user.name,
    firstNameOf(user.name),
    user.contactId,
    user.id,
    ...(user.ownershipIds ?? []),
    getField(user.rawFields ?? {}, [
      "partner registry",
      "partner profile",
      "related partner",
      "partner relation",
      "investor registry",
      "lender registry",
    ]),
  ]
    .filter(Boolean)
    .map((item) => normalizeComparable(String(item)))
    .filter((item) => item.length >= 2);

const sourceTitleIsUserScoped = (sourceTitle: string, user: BlueprintUser) => {
  const normalizedSource = normalizeComparable(sourceTitle);
  return identityTokensForUser(user).some((token) => token.length >= 3 && normalizedSource.includes(token));
};

const rowTextForScope = (fields: Record<string, string>) => normalizeComparable(fieldsToLine(fields));

const rowBelongsToUser = (fields: Record<string, string>, user: BlueprintUser, sourceTitle = "") => {
  if (sourceTitleIsUserScoped(sourceTitle, user)) return true;

  const tokens = identityTokensForUser(user);
  const ownershipFields = getField(fields, [
    "partner",
    "partner name",
    "partner scope",
    "assigned partner",
    "assigned portal",
    "portal visibility",
    "owner",
    "owner partner",
    "owner / contact",
    "relationship owner",
    "source partner",
    "introduced by",
    "referred by",
    "submitted by",
    "originator",
    "deal originator",
    "relationship owner",
    "capital relationship owner",
    "contact",
    "contact id",
    "email",
  ]);

  const compactOwnership = stripDashes(ownershipFields).toLowerCase();
  const ownershipIds = [user.id, ...(user.ownershipIds ?? [])]
    .map((id) => stripDashes(id).toLowerCase())
    .filter(Boolean);
  if (ownershipIds.some((id) => compactOwnership.includes(id))) return true;

  const normalizedOwnership = normalizeComparable(ownershipFields);
  return tokens.some((token) => token.length >= 3 && normalizedOwnership.includes(token));
};

const isCoreOrSharedSource = (sourceTitle: string) => {
  const normalized = normalizeComparable(sourceTitle);
  return (
    normalized.includes("core") ||
    normalized.includes("matching engine") ||
    normalized.includes("assets") ||
    normalized.includes("buy box") ||
    normalized.includes("matches") ||
    normalized.includes("signals") ||
    normalized.includes("submissions") ||
    normalized.includes("intake") ||
    normalized.includes("requests")
  );
};

const truthyValue = (value: string) => /^(yes|true|approved|cleared|visible|public|partner visible|founder approved)$/i.test(value.trim());
const falsyValue = (value: string) => /^(no|false|private|internal|hidden|not approved|restricted|draft)$/i.test(value.trim());

const isPartnerVisibleRow = (fields: Record<string, string>, user: BlueprintUser, sourceTitle: string) => {
  const visibility = getField(fields, [
    "partner visible",
    "partner visibility",
    "visibility",
    "portal visible",
    "visible to partner",
    "approved for partner",
    "founder approved",
    "cleared for partner",
  ]);

  if (visibility && falsyValue(visibility)) return false;
  if (visibility && truthyValue(visibility)) return true;

  // If a data source/page is already explicitly Brad-scoped, keep the row after identity filtering.
  if (sourceTitleIsUserScoped(sourceTitle, user)) return true;

  // Otherwise only keep rows that are clearly connected to the logged-in user.
  return rowBelongsToUser(fields, user, sourceTitle);
};

const sensitiveFieldPatterns = [
  "internal",
  "private",
  "password",
  "access code",
  "token",
  "secret",
  "payout",
  "commission",
  "fee split",
  "legal strategy",
  "source data",
  "underwriting logic",
  "underwriting note",
  "risk note",
  "core logic",
  "matching logic",
  "admin note",
  "founder note",
  "crystal note",
  "cp override",
  "wire",
  "bank",
  "ssn",
  "tax id",
];

const contactFieldPatterns = ["phone", "mobile", "direct email", "investor email", "buyer email", "contact details"];

const sanitizePartnerFields = (fields: Record<string, string>, user: BlueprintUser, sourceTitle: string) => {
  const approvedContact = truthyValue(
    getField(fields, ["contact approved", "contact visible", "intro approved", "full reveal approved", "founder approved"]),
  );
  const normalizedUserEmail = user.email.toLowerCase();

  return Object.entries(fields).reduce<Record<string, string>>((safe, [key, value]) => {
    if (!value) return safe;
    const normalizedKey = normalizeComparable(key);
    const normalizedValue = String(value).toLowerCase();

    if (sensitiveFieldPatterns.some((pattern) => normalizedKey.includes(pattern))) return safe;

    const isContactField = contactFieldPatterns.some((pattern) => normalizedKey.includes(pattern));
    if (isContactField && !approvedContact && !normalizedValue.includes(normalizedUserEmail)) return safe;

    // Keep partner identity rows useful, but do not leak other people's emails by default.
    if (normalizedKey === "email" && !normalizedValue.includes(normalizedUserEmail) && !approvedContact) return safe;

    safe[key] = value;
    return safe;
  }, {});
};

const toPortalRows = (
  rows: PageObjectResponse[],
  sourceTitle: string,
  user: BlueprintUser,
  forceUserScope = isCoreOrSharedSource(sourceTitle),
) =>
  rows
    .map((page) => {
      const fields = pageProperties(page);
      return {
        id: page.id,
        title: titleFromFields(fields),
        fields,
        sourceTitle,
      } satisfies PortalDatabaseRow;
    })
    .filter((row) => user.role === "admin" || !forceUserScope || rowBelongsToUser(row.fields, user, sourceTitle))
    .filter((row) => user.role === "admin" || isPartnerVisibleRow(row.fields, user, sourceTitle))
    .map((row) => ({
      ...row,
      fields: sanitizePartnerFields(row.fields, user, sourceTitle),
    }))
    .filter((row) => Object.keys(row.fields).length > 0);

const uniquePortalRows = (rows: PortalDatabaseRow[]) => {
  const seenIds = new Set<string>();
  return rows.filter((row) => {
    // Title aliases can resolve to the same Notion data source. The returned
    // page ID is the stable identity, so count it only once across aliases.
    const key = stripDashes(row.id);
    if (seenIds.has(key)) return false;
    seenIds.add(key);

    return true;
  });
};

const portalSectionTargets: Array<{
  key: string;
  title: string;
  description: string;
  titles: string[];
}> = [
  {
    key: "submissions",
    title: "My Submissions — CORE Status",
    description: "Partner-submitted assets, buy boxes, documents, support requests, matching requests, underwriting requests, and updates with live status from Partner Submissions — CORE.",
    titles: [
      "Partner Submissions — CORE",
      "SBF WORLD Partner Submissions",
      "My Submissions",
      "Submissions — Brad",
      "Support Requests",
    ],
  },
  {
    key: "active-matches",
    title: "Your Active Matches — Start Here",
    description: "Brad-scoped match records from 08 — Matching Engine — CORE, following Teaser → NDA → Full Reveal → LOI / PSA.",
    titles: [
      "08 — Matching Engine — CORE",
    ],
  },
  {
    key: "assets",
    title: "Your Assets Inside SBF WORLD",
    description: "Assets submitted by Brad or attributed to Brad, with partner-safe status, market, type, value, documents, and next action.",
    titles: ["Your Assets Inside SBF WORLD", "Brad Assets", "Assets — Brad", "05 — Assets — CORE"],
  },
  {
    key: "investors",
    title: "My Investors / Buyers / Lenders",
    description: "Investor, buyer, and lender relationships scoped to Brad from 04 — Investors, Buyers & Lenders — CORE.",
    titles: [
      "04 — Investors, Buyers & Lenders — CORE",
    ],
  },
  {
    key: "underwritten-assets",
    title: "My Underwriting",
    description: "Unique underwriting outputs scoped to Brad from 07 — Underwriting Engine — CORE only.",
    titles: [
      "07 — Underwriting Engine — CORE",
    ],
  },
  {
    key: "buy-box-signals",
    title: "My Buy Boxes & Mandates",
    description: "Brad-owned buy boxes and mandates from 06 — Buy Boxes & Mandates — CORE / Brad — CORE Buy Boxes.",
    titles: [
      "06 — Buy Boxes & Mandates — CORE",
    ],
  },
  {
    key: "deal-flow",
    title: "Matching & Deal Flow",
    description: "Brad-scoped match history and new match records from 08 — Matching Engine — CORE only.",
    titles: [
      "08 — Matching Engine — CORE",
    ],
  },
  {
    key: "documents",
    title: "Documents & Diligence",
    description: "Partner-visible diligence links and document status only. Internal/protected files remain filtered.",
    titles: ["Documents & Diligence", "Documents — Brad", "Diligence — Brad", "Partner Documents — Brad"],
  },
  {
    key: "workflow",
    title: "Your SBF WORLD Workflow",
    description: "Workflow and next-step routing pulled from Brad’s Notion portal where available.",
    titles: ["Your SBF WORLD Workflow", "Command Dashboard", "CORE Routing Note — Brad Partnership Activation"],
  },
  {
    key: "support",
    title: "Support Requests",
    description: "Support and next-step requests routed to Crystal Poe / SBF WORLD team when submitted.",
    titles: ["Support Requests", "Support — Brad", "Requests — Brad"],
  },
];

const getPortalDataSectionsForUser = async (user: BlueprintUser) => {
  const sections = await Promise.all(
    portalSectionTargets.map(async (target) => {
      const allRows: PortalDatabaseRow[] = [];
      const foundTitles: string[] = [];

      for (const title of target.titles) {
        const dataSourceId = await resolveDataSourceIdByTitle(title).catch(() => "");
        if (!dataSourceId) continue;

        try {
          const rows = await getDatabaseRows(dataSourceId);
          const safeRows = toPortalRows(rows, title, user, isCoreOrSharedSource(title));
          if (safeRows.length) {
            foundTitles.push(title);
            allRows.push(...safeRows);
          }
        } catch {
          // Missing access to this specific source should not break the whole portal.
        }
      }

      return {
        key: target.key,
        title: target.title,
        description: target.description,
        sourceTitles: Array.from(new Set(foundTitles)),
        rows: uniquePortalRows(allRows),
      };
    }),
  );

  return sections;
};

const REVIEW_RHYTHM = [
  { cadence: "Daily / as-needed", focus: "Urgent submissions, document gaps, full reveal requests, and time-sensitive buyer/asset movement." },
  { cadence: "Weekly", focus: "Match quality, underwriting readiness, buy box alignment, NDA status, and next-step routing." },
  { cadence: "Monthly", focus: "Partner performance, deal-flow themes, mandate alignment, and portal hygiene." },
];

const DASHBOARD_RULES = [
  "Brad can only see Brad-scoped records.",
  "Unrestricted CORE databases are filtered before display.",
  "Internal matching logic is not exposed.",
  "Other partners’ submissions are not shown.",
  "Investor contact details stay hidden unless approved for reveal.",
  "Internal underwriting, payout notes, legal strategy, and private diligence stay hidden unless Founder-approved.",
  "All submissions stay attributed to the logged-in partner.",
  "New entries route into God’s Blueprint CORE instead of legacy Global Assets wiring.",
];

const QUICK_ACTIONS = [
  "Submit new asset",
  "Add or update buy box",
  "Attach document links",
  "Request underwriting support",
  "Flag item for CORE review",
  "Confirm JV logic for a submission",
  "Request full reveal",
  "Request intro / next step",
];

export interface UploadedPartnerFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface PartnerPortalSubmissionInput {
  submissionType: string;
  fields: Record<string, string>;
  uploadedFiles?: UploadedPartnerFile[];
}

const submissionTypeLabel = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || "Partner Submission";

const notionParagraph = (content: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: {
    rich_text: [
      {
        type: "text",
        text: { content: content.slice(0, 1900) },
      },
    ],
  },
});

const notionHeading = (content: string) => ({
  object: "block",
  type: "heading_2",
  heading_2: {
    rich_text: [
      {
        type: "text",
        text: { content: content.slice(0, 1900) },
      },
    ],
  },
});

const notionBullet = (content: string) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: {
    rich_text: [
      {
        type: "text",
        text: { content: content.slice(0, 1900) },
      },
    ],
  },
});

const notionFileBlock = (file: UploadedPartnerFile) => ({
  object: "block",
  type: "file",
  file: {
    caption: [
      {
        type: "text",
        text: { content: `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` },
      },
    ],
    type: "file_upload",
    file_upload: { id: file.id },
  },
});

const NOTION_FILE_VERSION = "2026-03-11";

const notionUploadHeaders = () => ({
  Authorization: `Bearer ${requireEnv("NOTION_API_KEY")}`,
  "Notion-Version": NOTION_FILE_VERSION,
});

export async function uploadPartnerFileToNotion(file: File): Promise<UploadedPartnerFile> {
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new NotionConfigError(`${file.name} is larger than 20MB. Upload smaller files or split the diligence pack.`);
  }

  const createResponse = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      ...notionUploadHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      content_length: file.size,
    }),
  });

  const createPayload = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok) {
    const message = typeof createPayload?.message === "string" ? createPayload.message : createResponse.statusText;
    throw new NotionConfigError(`Unable to create Notion file upload for ${file.name}: ${message}`);
  }

  const uploadId = String(createPayload.id ?? "");
  const uploadUrl = String(createPayload.upload_url ?? `https://api.notion.com/v1/file_uploads/${uploadId}/send`);
  if (!uploadId) throw new NotionConfigError(`Notion did not return a file upload ID for ${file.name}.`);

  const form = new FormData();
  form.append("file", file, file.name);

  const sendResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: notionUploadHeaders(),
    body: form,
  });

  const sendPayload = await sendResponse.json().catch(() => ({}));
  if (!sendResponse.ok || sendPayload.status === "failed" || sendPayload.status === "expired") {
    const message = typeof sendPayload?.message === "string" ? sendPayload.message : sendResponse.statusText;
    throw new NotionConfigError(`Unable to upload ${file.name} to Notion: ${message}`);
  }

  return {
    id: uploadId,
    name: String(sendPayload.filename ?? file.name),
    contentType: String(sendPayload.content_type ?? file.type ?? "application/octet-stream"),
    size: Number(sendPayload.content_length ?? file.size),
  };
}

const createPageViaNotionApi = async (payload: Record<string, unknown>) => {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      ...notionUploadHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new NotionConfigError(`Unable to create SBF WORLD submission in Notion: ${message}`);
  }

  return data as { id: string };
};

const routeForSubmissionType = (submissionType: string) => {
  const normalized = submissionType.toLowerCase();
  if (normalized.includes("buy-box")) return "Buy Box / Mandate Review";
  if (normalized.includes("asset")) return "Asset Command / CORE Review";
  if (normalized.includes("document")) return "Documents & Diligence";
  if (normalized.includes("underwriting")) return "Underwriting Desk";
  if (normalized.includes("matching")) return "Matching Engine";
  if (normalized.includes("full-reveal")) return "Full Reveal / NDA Gate";
  if (normalized.includes("lock-request") || normalized.includes("project-lock")) return "Project Lock / Admin Approval";
  if (normalized.includes("intro")) return "Intro / Next Step Routing";
  if (normalized.includes("jv")) return "JV Logic Review";
  if (normalized.includes("core-review")) return "CORE Review";
  return "Support / Team Routing";
};

const submissionChildren = (
  typeLabel: string,
  user: BlueprintUser,
  timestamp: string,
  cleanFields: Array<readonly [string, string]>,
  route: string,
  status: string,
  uploadedFiles: UploadedPartnerFile[] = [],
) => [
  notionHeading("SBF WORLD Partner Intake Routing"),
  notionParagraph("Route: Partner Submissions — CORE / God’s Blueprint CORE. Source: website partner portal."),
  notionParagraph(`Submission Type: ${typeLabel}`),
  notionParagraph(`Status: ${status}`),
  notionParagraph(`Route: ${route}`),
  notionParagraph(`Submitted By: ${user.name}`),
  notionParagraph(`Email: ${user.email}`),
  notionParagraph(`Role: ${user.role}`),
  notionParagraph(`Contact ID: ${user.contactId || "Not provided"}`),
  notionParagraph(`Submitted At: ${timestamp}`),
  notionHeading("Submission Details"),
  ...cleanFields.map(([key, value]) => notionBullet(`${key}: ${value}`)),
  ...(uploadedFiles.length
    ? [
        notionHeading("Uploaded Documents"),
        ...uploadedFiles.map((file) => notionBullet(`${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · attached to this Notion submission`)),
        ...uploadedFiles.map(notionFileBlock),
      ]
    : []),
  notionHeading("Partner Visibility"),
  notionBullet("Visible to the submitting partner when linked by email, Contact ID, or partner scope."),
  notionBullet("Admin can review all submissions inside Partner Submissions — CORE."),
  notionHeading("Dashboard Rules Applied"),
  ...DASHBOARD_RULES.map((rule) => notionBullet(rule)),
];

type NotionSchemaProperty = { type?: string; name?: string } & Record<string, any>;

type RetrievedDataSource = {
  id: string;
  properties?: Record<string, NotionSchemaProperty>;
};

const retrieveDataSource = async (dataSourceId: string): Promise<RetrievedDataSource> => {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${requireEnv("NOTION_API_KEY")}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : response.statusText;
    throw new NotionConfigError(`Unable to read Partner Submissions — CORE schema: ${message}`);
  }

  return payload as RetrievedDataSource;
};

const findSchemaKey = (schema: Record<string, NotionSchemaProperty>, candidates: string[]) => {
  const entries = Object.entries(schema);
  const normalizedCandidates = candidates.map(normalizeComparable);

  const exact = entries.find(([key]) => normalizedCandidates.includes(normalizeComparable(key)));
  if (exact) return exact[0];

  const fuzzy = entries.find(([key]) =>
    normalizedCandidates.some((candidate) => normalizeComparable(key).includes(candidate) || candidate.includes(normalizeComparable(key))),
  );

  return fuzzy?.[0] ?? "";
};

const titleSchemaKey = (schema: Record<string, NotionSchemaProperty>) =>
  Object.entries(schema).find(([, value]) => value.type === "title")?.[0] ??
  findSchemaKey(schema, ["Submission Name", "Name", "Title"]);

const richTextProperty = (value: string) => ({
  rich_text: value
    ? [
        {
          type: "text",
          text: { content: value.slice(0, 1900) },
        },
      ]
    : [],
});

const titleProperty = (value: string) => ({
  title: [
    {
      type: "text",
      text: { content: (value || "Partner Submission").slice(0, 1900) },
    },
  ],
});

const selectProperty = (value: string) => ({ select: value ? { name: value.slice(0, 100) } : null });
const statusProperty = (value: string) => ({ status: value ? { name: value.slice(0, 100) } : null });
const multiSelectProperty = (value: string) => ({
  multi_select: value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((name) => ({ name: name.slice(0, 100) })),
});
const urlProperty = (value: string) => ({ url: /^https?:\/\//i.test(value.trim()) ? value.trim() : null });
const emailProperty = (value: string) => ({ email: /@/.test(value) ? value.trim().slice(0, 200) : null });
const dateProperty = (value: string) => ({ date: value ? { start: value } : null });
const numberProperty = (value: string) => {
  const amount = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return { number: Number.isFinite(amount) ? amount : null };
};

const filesProperty = (files: UploadedPartnerFile[]) => ({
  files: files.map((file) => ({
    name: file.name,
    type: "file_upload",
    file_upload: { id: file.id },
  })),
});

const notionPropertyForType = (type: string | undefined, value: string, isTitle = false) => {
  if (isTitle || type === "title") return titleProperty(value);
  if (type === "select") return selectProperty(value);
  if (type === "status") return statusProperty(value);
  if (type === "multi_select") return multiSelectProperty(value);
  if (type === "email") return emailProperty(value);
  if (type === "url") return urlProperty(value);
  if (type === "date") return dateProperty(value);
  if (type === "number") return numberProperty(value);
  if (type === "checkbox") return { checkbox: truthyValue(value) };
  if (type === "phone_number") return { phone_number: value || null };
  return richTextProperty(value);
};

const submissionFieldAliases: Record<string, string[]> = {
  "Submission Name": ["Submission Name", "Name", "Title"],
  "Submission Type": ["Submission Type", "Type", "Request Type", "Category"],
  "Submitted By": ["Submitted By", "Partner Name", "Originator", "Owner / Contact", "Owner"],
  "Submitted Email": ["Submitted Email", "Email", "Submitted By Email", "Partner Email", "Contact Email"],
  "Contact ID": ["Contact ID", "Contact", "Member ID"],
  "Partner Name": ["Partner Name", "Partner", "Owner", "Owner / Contact"],
  "Assigned Portal": ["Assigned Portal", "Portal", "Portal Access"],
  Status: ["Status", "Submission Status", "Review Status"],
  Priority: ["Priority", "Urgency"],
  Route: ["Route", "Workflow Route", "CORE Route", "Routing"],
  "Asset / Match / Item Name": ["Asset / Match / Item Name", "Asset Name", "Item Name", "Match Name", "Mandate Name", "Title"],
  "Investor / Buyer Name": ["Investor / Buyer Name", "Investor / buyer name", "Buyer Name", "Investor Name"],
  "Contact Details": ["Contact Details", "Contact details", "Contact"],
  "Mandate Criteria": ["Mandate Criteria", "Mandate criteria", "Criteria"],
  Budget: ["Budget", "Capital", "Price", "Value"],
  Geography: ["Geography", "Location", "Region", "Market"],
  "Asset Class": ["Asset Class", "Asset class", "Pillar", "Asset Type"],
  "NDA Status": ["NDA Status", "NDA status", "NDA"],
  "Proof of Funds Status": ["Proof of Funds Status", "Proof-of-funds status", "POF Status", "Proof of Funds"],
  "Document Links": ["Document Links", "Document links", "Document URLs", "Document URL"],
  "Uploaded Files": ["Uploaded Files", "Attachments", "Files", "Documents", "Diligence Files", "Asset Documents"],
  "Document Count": ["Document Count", "File Count", "Uploaded File Count"],
  Notes: ["Notes", "Notes / special requirements", "Special Requirements"],
  "Submitted At": ["Submitted At", "Created", "Created Date", "Date Submitted"],
  "Last Updated": ["Last Updated", "Updated", "Updated At"],
  "Assigned To": ["Assigned To", "Reviewer", "Team Owner"],
  "Partner Visibility": ["Partner Visibility", "Partner Visible", "Visibility", "Portal Visible"],
  "Partner Scope": ["Partner Scope", "Scope", "Partner Key"],
  "Request Action": ["Request Action", "Action", "Partner Action"],
  "Target Record ID": ["Target Record ID", "Record ID", "Source Record ID", "Linked Record ID"],
  "Target Record Title": ["Target Record Title", "Target Asset", "Target Buy Box", "Target Match", "Asset Name", "Match Name"],
  "Target Source": ["Target Source", "Source", "Source Table", "Source Database"],
  "Admin Decision": ["Admin Decision", "Decision", "Approval Decision"],
};

const buildSubmissionPropertiesForSchema = (
  schema: Record<string, NotionSchemaProperty>,
  values: Record<string, string>,
  uploadedFiles: UploadedPartnerFile[] = [],
) => {
  const properties: Record<string, unknown> = {};
  const titleKey = titleSchemaKey(schema);

  if (titleKey) {
    properties[titleKey] = titleProperty(values["Submission Name"] || "Partner Submission");
  }

  Object.entries(values).forEach(([field, value]) => {
    if (!value) return;
    const schemaKey = findSchemaKey(schema, submissionFieldAliases[field] ?? [field]);
    if (!schemaKey || schemaKey === titleKey || !schema[schemaKey]) return;
    properties[schemaKey] = notionPropertyForType(schema[schemaKey].type, value);
  });

  if (uploadedFiles.length) {
    const filesKey = findSchemaKey(schema, submissionFieldAliases["Uploaded Files"] ?? ["Uploaded Files"]);
    if (filesKey && schema[filesKey]?.type === "files") {
      properties[filesKey] = filesProperty(uploadedFiles);
    }
  }

  return properties;
};

export async function createPartnerPortalSubmission(email: string, input: PartnerPortalSubmissionInput, authenticatedUser?: BlueprintUser): Promise<PartnerPortalSubmissionResult> {
  const user = authenticatedUser?.email.toLowerCase() === email.trim().toLowerCase()
    ? authenticatedUser
    : await findApprovedPortalUser(email);
  if (!user) {
    throw new NotionConfigError("No active Notion user found for this submission email.");
  }

  const notion = getNotionClient();
  const typeLabel = submissionTypeLabel(input.submissionType);
  const timestamp = new Date().toISOString();
  const dateLabel = timestamp.slice(0, 10);
  const cleanFields = Object.entries(input.fields ?? {})
    .map(([key, value]) => [key.trim(), String(value ?? "").trim()] as const)
    .filter(([key, value]) => key && value);

  const title = `${typeLabel} — ${user.name} — ${dateLabel}`;
  const route = routeForSubmissionType(input.submissionType);
  const status = "New";
  const partnerScope = [user.name, user.email, user.contactId].filter(Boolean).join(" | ");
  const cleanFieldsObject = Object.fromEntries(cleanFields);
  const uploadedFiles = input.uploadedFiles ?? [];

  const baseFields: Record<string, string> = {
    "Submission Name": title,
    "Submission Type": typeLabel,
    "Submitted By": user.name,
    "Submitted Email": user.email,
    "Contact ID": user.contactId || "",
    "Partner Name": user.name,
    "Assigned Portal": `${rolePortalTitle(user.role)} Portal — ${firstNameOf(user.name)}`,
    Status: status,
    Priority: input.submissionType === "core-review" || input.submissionType === "full-reveal" || input.submissionType === "lock-request" ? "High" : "Normal",
    Route: route,
    "Asset / Match / Item Name": cleanFieldsObject["Asset / match / item name"] || cleanFieldsObject["Asset name"] || cleanFieldsObject.Asset || "",
    "Investor / Buyer Name": cleanFieldsObject["Investor / buyer name"] || "",
    "Contact Details": cleanFieldsObject["Contact details"] || "",
    "Mandate Criteria": cleanFieldsObject["Mandate criteria"] || "",
    Budget: cleanFieldsObject.Budget || "",
    Geography: cleanFieldsObject.Geography || cleanFieldsObject.Market || "",
    "Asset Class": cleanFieldsObject["Asset class"] || cleanFieldsObject["Asset Type"] || "",
    "NDA Status": cleanFieldsObject["NDA status"] || "",
    "Proof of Funds Status": cleanFieldsObject["Proof-of-funds status"] || cleanFieldsObject["Proof of Funds Status"] || "",
    "Document Links": cleanFieldsObject["Document links"] || "",
    "Uploaded Files": uploadedFiles.map((file) => file.name).join(", "),
    "Document Count": uploadedFiles.length ? String(uploadedFiles.length) : "",
    "Request Action": cleanFieldsObject["Request Action"] || cleanFieldsObject.Request || typeLabel,
    "Target Record ID": cleanFieldsObject["Target Record ID"] || cleanFieldsObject["Record ID"] || cleanFieldsObject["Asset ID"] || "",
    "Target Record Title": cleanFieldsObject["Target Record Title"] || cleanFieldsObject["Asset / match / item name"] || cleanFieldsObject["Asset name"] || cleanFieldsObject.Asset || "",
    "Target Source": cleanFieldsObject["Target Source"] || cleanFieldsObject["Source"] || "",
    "Admin Decision": cleanFieldsObject["Admin Decision"] || "Pending admin review",
    Notes: cleanFieldsObject["Notes / special requirements"] || cleanFieldsObject.Notes || (input.submissionType === "matching" ? JSON.stringify({ buyBoxId: cleanFieldsObject["Buy Box ID"] || "", buyBoxName: cleanFieldsObject["Buy Box"] || "", score: cleanFieldsObject["Match Score"] || "", price: cleanFieldsObject.Price || "", sourcePartner: cleanFieldsObject["Source Partner Lane"] || "" }) : ""),
    "Submitted At": timestamp,
    "Last Updated": timestamp,
    "Assigned To": "Crystal Poe / SBF WORLD Team",
    "Partner Visibility": "Partner Visible",
    "Partner Scope": partnerScope,
  };

  const databaseId = await getPartnerSubmissionsDataSourceId().catch(() => "");

  if (databaseId) {
    try {
      const dataSource = await retrieveDataSource(databaseId);
      const properties = buildSubmissionPropertiesForSchema(dataSource.properties ?? {}, baseFields, uploadedFiles);

      const response = await createPageViaNotionApi({
        parent: { data_source_id: databaseId },
        properties,
        children: submissionChildren(typeLabel, user, timestamp, cleanFields, route, status, uploadedFiles).slice(0, 90),
      });

      return {
        id: response.id,
        title,
        route: "Partner Submissions — CORE",
        status,
        storage: "database",
      };
    } catch (error) {
      console.warn("Partner Submissions — CORE database write failed; falling back to page routing.", error);
    }
  }

  const parentPageId =
    optionalEnv("NOTION_PARTNER_INTAKE_PARENT_PAGE_ID") ||
    optionalEnv("NOTION_SUBMISSIONS_PARENT_PAGE_ID") ||
    requireEnv("NOTION_GODS_BLUEPRINT_PAGE_ID");

  const response = await createPageViaNotionApi({
    parent: { page_id: parentPageId },
    properties: {
      title: [
        {
          type: "text",
          text: { content: title },
        },
      ],
    },
    children: submissionChildren(typeLabel, user, timestamp, cleanFields, route, status, uploadedFiles).slice(0, 90),
  });

  return {
    id: response.id,
    title,
    route: "God’s Blueprint CORE child page fallback",
    status,
    storage: "page-fallback",
  };
}

export async function getDynamicPortalForEmail(email: string): Promise<DynamicPortalPage | null> {
  const user = await findApprovedPortalUser(email);
  if (!user) return null;

  return getDynamicPortalForAuthenticatedUser(user);
}

export async function getDynamicPortalForAuthenticatedUser(user: BlueprintUser): Promise<DynamicPortalPage> {
  const scopedUser = await attachNewBuildOwnershipIds(user);

  return {
    title: `${rolePortalTitle(scopedUser.role)} Portal — ${firstNameOf(scopedUser.name)}`,
    pageId: optionalEnv("NOTION_NEW_BUILD_ZONE_PAGE_ID"),
    user: scopedUser,
    blocks: [],
    sections: await getGodBlueprintSectionsForUser(scopedUser),
    reviewRhythm: REVIEW_RHYTHM,
    dashboardRules: DASHBOARD_RULES,
    quickActions: QUICK_ACTIONS,
    source: "notion",
  };
}

export interface PortalNotificationItem {
  id: string;
  title: string;
  status: string;
  message: string;
  sourceTitle: string;
  updated: string;
  actionType: string;
  target: string;
}

const notificationStatusFromFields = (fields: Record<string, string>) =>
  getField(fields, ["status", "submission status", "review status", "approval", "admin decision", "full reveal status", "lock status", "project status"]) || "Open";

const notificationTitleFromRow = (row: PortalDatabaseRow) =>
  getField(row.fields, ["target record title", "asset / match / item name", "asset name", "match name", "buy box name", "mandate name", "submission name", "name", "title"]) || row.title || "SBF WORLD record";

export async function getPortalNotificationsForEmail(email: string): Promise<PortalNotificationItem[]> {
  const user = await findApprovedPortalUser(email);
  if (!user) return [];

  const sections = await getGodBlueprintSectionsForUser(user).catch(() => []);
  const sectionRows = sections.flatMap((section) => section.rows);

  // Always read Partner Submissions — CORE directly as well. The notification bell must not depend
  // on which dashboard tab happened to load first. Yes, Notion made us be this explicit.
  const submissionRows = await (async () => {
    const databaseId = await getPartnerSubmissionsDataSourceId().catch(() => "");
    if (!databaseId) return [] as PortalDatabaseRow[];
    const pages = await getDatabaseRows(databaseId).catch(() => []);
    return toPortalRows(pages, "Partner Submissions — CORE", user, true);
  })();

  const rows = uniquePortalRows([...submissionRows, ...sectionRows]);
  const visible = rows
    .map((row) => {
      const status = notificationStatusFromFields(row.fields);
      const normalized = normalizeComparable(status);
      const actionType = getField(row.fields, ["request action", "submission type", "type", "route", "admin decision"]) || row.sourceTitle || "SBF WORLD update";
      const target = notificationTitleFromRow(row);
      const updated = getField(row.fields, ["last updated", "updated", "admin updated", "reviewed at", "submitted at", "created time", "last edited time"]) || "";
      const haystack = normalizeComparable(`${status} ${actionType} ${target} ${row.sourceTitle} ${Object.values(row.fields).join(" ")}`);
      const isUseful = /approved|reveal|locked|needs|review|rejected|cleared|routed|complete|submitted|new|pending/.test(haystack);
      if (!isUseful) return null;

      const message = haystack.includes("full reveal approved") || (haystack.includes("approved") && haystack.includes("reveal"))
        ? `${target} full reveal was approved by SBF WORLD admin. Open the record to review the approved teaser/reveal details.`
        : haystack.includes("approved") || haystack.includes("cleared")
          ? `${target} was approved by SBF WORLD admin. Open the record to review the approved partner-safe details.`
          : haystack.includes("locked")
            ? `${target} has been locked for SBF WORLD review. Admin is controlling the next step.`
            : haystack.includes("needs")
              ? `${target} needs additional documents or clarification before approval.`
              : haystack.includes("rejected")
                ? `${target} was rejected or declined by admin. Check the submission details for the reason.`
                : `${target} is ${status}.`;

      return {
        id: row.id,
        title: target,
        status,
        message,
        sourceTitle: row.sourceTitle || "SBF WORLD",
        updated,
        actionType,
        target,
      } satisfies PortalNotificationItem;
    })
    .filter((item): item is PortalNotificationItem => Boolean(item));

  return visible.slice(0, 30);
}


export interface AdminCrmRow {
  id: string;
  title: string;
  entityType: string;
  sourceTitle: string;
  status: string;
  owner: string;
  partnerScope: string;
  email: string;
  contactId: string;
  role: string;
  value: string;
  geography: string;
  assetClass: string;
  route: string;
  updated: string;
  fields: Record<string, string>;
}

export interface AdminCrmSource {
  key: string;
  title: string;
  entityType: string;
  dataSourceId: string;
  rows: AdminCrmRow[];
}

export interface AdminBlueprintModule {
  id: string;
  title: string;
  type: "page" | "data_source" | "linked_page";
  category: string;
  pageId: string;
  dataSourceId: string;
  openUrl: string;
  blockCount: number;
  recordCount: number;
  childCount: number;
  status: string;
  fields: Record<string, string>;
  blocks: NotionContentBlock[];
  rows: AdminCrmRow[];
}

export interface AdminBlueprintSnapshot {
  pageId: string;
  title: string;
  openUrl: string;
  modules: AdminBlueprintModule[];
  totals: {
    modules: number;
    pages: number;
    dataSources: number;
    records: number;
    blocks: number;
  };
}

export interface AdminCrmSnapshot {
  admin: BlueprintUser;
  sources: AdminCrmSource[];
  rows: AdminCrmRow[];
  users: BlueprintUser[];
  blueprint: AdminBlueprintSnapshot;
  totals: {
    users: number;
    partners: number;
    investors: number;
    lenders: number;
    submissions: number;
    assets: number;
    buyBoxes: number;
    matches: number;
    pendingReview: number;
    approved: number;
    locked: number;
    fullRevealRequests: number;
    totalRows: number;
  };
}


const notionObjectUrl = (id: string) => `https://www.notion.so/${stripDashes(id)}`;

const blueprintCategoryForTitle = (title: string) => {
  const normalized = normalizeComparable(title);
  if (normalized.includes("core")) return "CORE database";
  if (normalized.includes("admin") || normalized.includes("founder")) return "Admin command";
  if (normalized.includes("portal")) return "Portal system";
  if (normalized.includes("snapshot") || normalized.includes("brief")) return "Snapshot / report";
  if (normalized.includes("consult")) return "Consulting layer";
  if (normalized.includes("activation") || normalized.includes("integration")) return "Activation";
  return "God’s Blueprint";
};

const titleFromPageObject = (page: PageObjectResponse) =>
  titleFromFields(pageProperties(page)) || "God’s Blueprint";

const loadRowsForBlueprintDataSource = async (title: string, blockId: string) => {
  const resolved = (await resolveDataSourceIdByTitle(title).catch(() => "")) || stripDashes(blockId);
  try {
    const pages = await getDatabaseRows(resolved);
    return {
      dataSourceId: resolved,
      rows: pages.map((page) => adminRowFromPage(page, title, blueprintCategoryForTitle(title))),
    };
  } catch {
    return { dataSourceId: resolved, rows: [] as AdminCrmRow[] };
  }
};

const blueprintModuleFromChildBlock = async (block: BlockObjectResponse, index: number): Promise<AdminBlueprintModule | null> => {
  if (block.type !== "child_page" && block.type !== "child_database") return null;

  const title = block.type === "child_page" ? block.child_page.title : block.child_database.title;
  const category = blueprintCategoryForTitle(title);
  const fields: Record<string, string> = {};
  let blocks: NotionContentBlock[] = [];
  let rows: AdminCrmRow[] = [];
  let dataSourceId = "";
  let childCount = 0;
  let status = "Connected";

  if (block.type === "child_database") {
    const loaded = await loadRowsForBlueprintDataSource(title, block.id);
    dataSourceId = loaded.dataSourceId;
    rows = loaded.rows;
    status = rows.length ? "Live data source" : "Data source shared, no visible rows";
  } else {
    const childBlocks = await getPageBlocks(block.id).catch(() => []);
    childCount = childBlocks.filter((child) => child.type === "child_page" || child.type === "child_database").length;
    blocks = childBlocks.map(normalizeBlock).filter((item): item is NotionContentBlock => Boolean(item));
    Object.assign(fields, extractFields(blocks));

    const childDataSources = childBlocks.filter((child) => child.type === "child_database");
    if (childDataSources.length) {
      const settled = await Promise.allSettled(
        childDataSources.map(async (child) => {
          if (child.type !== "child_database") return { dataSourceId: "", rows: [] as AdminCrmRow[] };
          return loadRowsForBlueprintDataSource(child.child_database.title, child.id);
        }),
      );
      const loaded = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      dataSourceId = loaded.map((item) => item.dataSourceId).filter(Boolean).join(", ");
      rows = loaded.flatMap((item) => item.rows);
    }
    status = blocks.length || rows.length || childCount ? "Page access granted" : "Page shared, no visible blocks";
  }

  return {
    id: `${index}-${stripDashes(block.id)}`,
    title,
    type: block.type === "child_database" ? "data_source" : "page",
    category,
    pageId: block.type === "child_page" ? block.id : "",
    dataSourceId,
    openUrl: notionObjectUrl(block.id),
    blockCount: blocks.length,
    recordCount: rows.length,
    childCount,
    status,
    fields,
    blocks: blocks.slice(0, 80),
    rows,
  };
};

const searchBlueprintModuleByTitle = async (title: string, index: number): Promise<AdminBlueprintModule | null> => {
  const results = await notionSearch(title).catch(() => []);
  const normalizedTitle = normalizeComparable(title);
  const hit = results
    .map((item) => ({ item, title: searchResultTitle(item) }))
    .find((entry) => normalizeComparable(entry.title) === normalizedTitle || normalizeComparable(entry.title).includes(normalizedTitle));

  if (!hit?.item?.id) return null;

  if (hit.item.object === "data_source") {
    const loaded = await loadRowsForBlueprintDataSource(hit.title || title, hit.item.id);
    return {
      id: `registry-${index}-${stripDashes(hit.item.id)}`,
      title: hit.title || title,
      type: "data_source",
      category: blueprintCategoryForTitle(hit.title || title),
      pageId: "",
      dataSourceId: loaded.dataSourceId,
      openUrl: notionObjectUrl(hit.item.id),
      blockCount: 0,
      recordCount: loaded.rows.length,
      childCount: 0,
      status: loaded.rows.length ? "Live data source" : "Data source shared, no visible rows",
      fields: {},
      blocks: [],
      rows: loaded.rows,
    };
  }

  const pageId = hit.item.id;
  const childBlocks = await getPageBlocks(pageId).catch(() => []);
  const blocks = childBlocks.map(normalizeBlock).filter((item): item is NotionContentBlock => Boolean(item));
  return {
    id: `registry-${index}-${stripDashes(pageId)}`,
    title: hit.title || title,
    type: "linked_page",
    category: blueprintCategoryForTitle(hit.title || title),
    pageId,
    dataSourceId: "",
    openUrl: notionObjectUrl(pageId),
    blockCount: blocks.length,
    recordCount: 0,
    childCount: childBlocks.filter((child) => child.type === "child_page" || child.type === "child_database").length,
    status: blocks.length ? "Page access granted" : "Page shared, no visible blocks",
    fields: extractFields(blocks),
    blocks: blocks.slice(0, 80),
    rows: [],
  };
};

export async function getGodBlueprintAdminSnapshot(): Promise<AdminBlueprintSnapshot> {
  const pageId = optionalEnv("NOTION_NEW_BUILD_ZONE_PAGE_ID") || requireEnv("NOTION_GODS_BLUEPRINT_PAGE_ID");
  const notion = getNotionClient();
  const rootPage = await notion.pages.retrieve({ page_id: pageId }).catch(() => null);
  const rootTitle = rootPage && isPageObject(rootPage) ? titleFromPageObject(rootPage) : "God’s Blueprint";
  const rootBlocks = await getPageBlocks(pageId);
  const children = rootBlocks.filter((block) => block.type === "child_page" || block.type === "child_database");

  const modulesFromChildren = (
    await Promise.all(children.map((block, index) => blueprintModuleFromChildBlock(block, index)))
  ).filter((item): item is AdminBlueprintModule => Boolean(item));

  const seenTitles = new Set(modulesFromChildren.map((item) => normalizeComparable(item.title)));
  const registryFallbackTitles = BLUEPRINT_MODULES.map((module) => module.title).filter((title) => !seenTitles.has(normalizeComparable(title)));
  const fallbackLimit = modulesFromChildren.length ? 0 : registryFallbackTitles.length;
  const fallbackModules = fallbackLimit
    ? (
        await Promise.all(registryFallbackTitles.slice(0, fallbackLimit).map((title, index) => searchBlueprintModuleByTitle(title, index)))
      ).filter((item): item is AdminBlueprintModule => Boolean(item))
    : [];

  const modules = [...modulesFromChildren, ...fallbackModules];

  return {
    pageId,
    title: rootTitle,
    openUrl: notionObjectUrl(pageId),
    modules,
    totals: {
      modules: modules.length,
      pages: modules.filter((module) => module.type !== "data_source").length,
      dataSources: modules.filter((module) => module.type === "data_source" || module.dataSourceId).length,
      records: modules.reduce((sum, module) => sum + module.recordCount, 0),
      blocks: modules.reduce((sum, module) => sum + module.blockCount, 0),
    },
  };
}

async function getGodBlueprintSectionsForUser(user: BlueprintUser): Promise<DynamicPortalDataSection[]> {
  if (!newBuildZoneEnabled()) {
    throw new NotionConfigError("NOTION_NEW_BUILD_ZONE_PAGE_ID is required. Legacy Notion sources are disabled.");
  }

  const definitions = [
    { key: "assets", title: "05 — Assets — CORE" },
    { key: "buy-box-signals", title: "06 — Buy Boxes & Mandates — CORE" },
    { key: "investors", title: "04 — Investors, Buyers & Lenders — CORE" },
    { key: "active-matches", title: "08 — Matching Engine — CORE" },
    { key: "submissions", title: "12 — Partner Submissions — CORE" },
    { key: "documents", title: "11 — Documents & Governance — CORE" },
  ] as const;

  const assetDataSourceId = newBuildSourceForTitle("05 — Assets — CORE");
  let assetPages: PageObjectResponse[];
  try {
    assetPages = await getDatabaseRows(assetDataSourceId);
  } catch (error) {
    console.warn("Queryable CORE sources are unavailable; using canonical New Build portal pages.", error);
    return canonicalNewBuildSectionsForUser(user);
  }
  const userOwnerIds = [user.id, ...(user.ownershipIds ?? [])]
    .map((id) => stripDashes(id).toLowerCase())
    .filter(Boolean);
  const explicitlyOwned = (fields: Record<string, string>) => {
    const ownership = stripDashes(getField(fields, [
      "source partner", "owner partner", "related partner", "assigned partner", "owner", "related investor", "related lender",
    ])).toLowerCase();
    return user.role === "admin" || userOwnerIds.some((id) => ownership.includes(id));
  };

  const sections = (await Promise.all(definitions.map(async ({ key, title }): Promise<DynamicPortalDataSection | null> => {
    try {
      const dataSourceId = newBuildSourceForTitle(title);
      if (!dataSourceId) throw new NotionConfigError(`${title} is missing from the New Build Zone source manifest.`);
      const pages = key === "assets" ? assetPages : await getDatabaseRows(dataSourceId);
      const rows = key === "assets"
        ? pages
            .map((page) => {
              const fields = pageProperties(page);
              return { id: page.id, title: titleFromFields(fields), fields, sourceTitle: title } satisfies PortalDatabaseRow;
            })
            .filter((row) => explicitlyOwned(row.fields))
            .map((row) => ({ ...row, fields: sanitizePartnerFields(row.fields, user, title) }))
        : toPortalRows(pages, title, user, true).filter((row) =>
            ["buy-box-signals", "investors", "underwritten-assets", "active-matches"].includes(key)
              ? explicitlyOwned(row.fields)
              : true,
          );
      return {
        key,
        title,
        description: `Owner-scoped records fetched only from New Build Zone — 8/5/2026 for ${user.name}.`,
        sourceTitles: [title],
        rows: uniquePortalRows(rows),
      } satisfies DynamicPortalDataSection;
    } catch (error) {
      console.error(`Portal section ${title} could not be loaded`, error);
      return null;
    }
  }))).filter((section): section is DynamicPortalDataSection => section !== null);

  const completeAssets = assetPages
    .map((page) => {
      const fields = pageProperties(page);
      return { id: page.id, title: titleFromFields(fields), fields, sourceTitle: "05 — Assets — CORE" } satisfies PortalDatabaseRow;
    })
    .filter((row) => isCompleteNewBuildAsset(row.fields))
    .filter((row) => explicitlyOwned(row.fields))
    .filter((row) => isPartnerVisibleRow(row.fields, user, "05 — Assets — CORE"))
    .map((row) => ({ ...row, fields: sanitizePartnerFields(row.fields, user, "05 — Assets — CORE") }));
  sections.push({
    key: "complete-assets",
    title: "Complete Assets",
    description: "Founder-approved and portal-visible assets passing every New Build Zone completion requirement.",
    sourceTitles: ["05 — Assets — CORE"],
    rows: completeAssets,
  });

  // Expose only NDA-gated metadata/counts in the ordinary portal payload. Full
  // underwriting fields are returned exclusively by getFullUnderwritingForMatch
  // after consent has been recorded by the deal-workflow endpoint.
  const underwritingPages = await getDatabaseRows(newBuildSourceForTitle("07 — Underwriting Engine — CORE")).catch(() => []);
  const underwritingByAssetId = new Map<string, { page: PageObjectResponse; fields: Record<string, string> }>();
  underwritingPages.forEach((page) => {
    const fields = pageProperties(page);
    const relations = stripDashes(getField(fields, ["Related Asset", "Asset", "Related Assets"])).toLowerCase();
    completeAssets.forEach((asset) => {
      if (relations.includes(stripDashes(asset.id).toLowerCase()) && !underwritingByAssetId.has(asset.id)) {
        underwritingByAssetId.set(asset.id, { page, fields });
      }
    });
  });
  const protectedUnderwritingRows = completeAssets.map((asset) => {
    const linked = underwritingByAssetId.get(asset.id);
    return {
      id: linked?.page.id || `nda-gated-${asset.id}`,
      title: getField(asset.fields, ["Asset Name", "Property Name", "Name"]) || asset.title,
      sourceTitle: "07 — Underwriting Engine — CORE",
      fields: {
        status: linked ? getField(linked.fields, ["Status"]) || "Complete" : "Complete — relation pending",
        "underwriting type": linked ? getField(linked.fields, ["Underwriting Type"]) : getField(asset.fields, ["Asset Type"]),
        access: "NDA required — open the related match to consent and view",
      },
    } satisfies PortalDatabaseRow;
  });
  sections.push({
    key: "underwritten-assets",
    title: "07 — Underwriting Engine — CORE",
    description: "NDA-gated underwriting packages related to Brad's 15 canonical complete assets. Protected fields are excluded from this payload.",
    sourceTitles: ["07 — Underwriting Engine — CORE"],
    rows: protectedUnderwritingRows,
  });

  const assets = completeAssets;
  const completeAssetIds = new Set(
    assets.filter((row) => isCompleteNewBuildAsset(row.fields)).map((row) => stripDashes(row.id).toLowerCase()),
  );
  const matches = sections.find((section) => section.key === "active-matches");
  if (matches) {
    matches.rows = matches.rows.filter((row) => {
      const relationText = stripDashes(Object.values(row.fields).join(" ")).toLowerCase();
      return Array.from(completeAssetIds).some((id) => relationText.includes(id));
    });
  }

  return sections;
}

export async function getFullUnderwritingForMatch(
  user: BlueprintUser,
  matchId: string,
): Promise<PortalDatabaseRow[]> {
  const scopedUser = await attachNewBuildOwnershipIds(user);
  const notion = getNotionClient();
  const match = await notion.pages.retrieve({ page_id: matchId });
  if (!isPageObject(match)) throw new NotionConfigError("The selected match could not be found.");

  const matchFields = pageProperties(match);
  if (scopedUser.role !== "admin" && !rowBelongsToUser(matchFields, scopedUser, "08 — Matching Engine — CORE")) {
    throw new NotionConfigError("This match is not assigned to the current portal user.");
  }

  const underwritingId = newBuildSourceForTitle("07 — Underwriting Engine — CORE");
  const pages = await getDatabaseRows(underwritingId);
  const matchTitle = titleFromFields(matchFields);
  const relationIds = `${matchId} ${Object.values(matchFields).join(" ")}`
    .match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi) ?? [];
  const tokens = [matchId, ...relationIds, matchTitle]
    .map((value) => normalizeComparable(stripDashes(value)))
    .filter((value) => value.length >= 8);

  return pages
    .map((page) => {
      const fields = pageProperties(page);
      return {
        id: page.id,
        title: titleFromFields(fields),
        fields: Object.fromEntries(
          Object.entries(fields).filter(([key]) => !/password|secret|token|private key|bank account|wire|ssn|tax id/i.test(key)),
        ),
        sourceTitle: "07 — Underwriting Engine — CORE",
      } satisfies PortalDatabaseRow;
    })
    .filter((row) => {
      const haystack = normalizeComparable(stripDashes(`${row.id} ${row.title} ${Object.values(row.fields).join(" ")}`));
      return tokens.some((token) => haystack.includes(token));
    });
}

export async function getProofOfFundsApprovalForMatch(user: BlueprintUser, matchId: string) {
  const databaseId = await getPartnerSubmissionsDataSourceId();
  const pages = await getDatabaseRows(databaseId);
  const email = normalizeComparable(user.email);
  const targetId = stripDashes(matchId).toLowerCase();
  const records = pages
    .map((page) => ({ id: page.id, fields: pageProperties(page) }))
    .filter(({ fields }) => {
      const text = stripDashes(Object.values(fields).join(" ")).toLowerCase();
      return text.includes(targetId) && normalizeComparable(Object.values(fields).join(" ")).includes(email) && /proof of funds|proof-of-funds|pof/i.test(Object.values(fields).join(" "));
    });
  const latest = records.at(-1);
  const status = latest ? getField(latest.fields, ["admin decision", "approval decision", "status", "review status", "proof of funds status"]) : "Not submitted";
  return {
    submitted: Boolean(latest),
    approved: /approved|verified|cleared|accepted/i.test(status) && !/pending|submitted|review/i.test(status),
    status,
    recordId: latest?.id || "",
  };
}

const adminSourceTargets: Array<{ key: string; title: string; entityType: string; aliases: string[] }> = [
  {
    key: "people",
    title: "02 — People, Members & Relationships — CORE",
    entityType: "People / Portal Access",
    aliases: ["02 — People, Members & Relationships — CORE", "People Members Relationships", "Relationships CORE", "All People", "People"],
  },
  {
    key: "investors",
    title: "04 — Investors, Buyers & Lenders — CORE",
    entityType: "Investors / Buyers / Lenders",
    aliases: ["04 — Investors, Buyers & Lenders — CORE", "04 Investors Buyers Lenders CORE", "Investors, Buyers & Lenders — CORE", "Investors Buyers Lenders CORE", "Investors", "Buyers", "Lenders"],
  },
  {
    key: "submissions",
    title: "Partner Submissions — CORE",
    entityType: "Partner Submissions",
    aliases: ["Partner Submissions — CORE", "Partner Submissions CORE", "Partner Submissions", "Submissions CORE", "SBF WORLD Partner Submissions"],
  },
  {
    key: "assets",
    title: "05 — Assets — CORE",
    entityType: "Assets",
    aliases: ["05 — Assets — CORE", "Assets — CORE", "Assets CORE", "Assets"],
  },
  {
    key: "underwriting",
    title: "07 — Underwriting Engine — CORE",
    entityType: "Underwriting Engine",
    aliases: ["07 — Underwriting Engine — CORE", "07 Underwriting Engine CORE", "Underwriting Engine — CORE", "Underwriting Engine", "Underwriting"],
  },
  {
    key: "matching",
    title: "08 — Matching Engine — CORE",
    entityType: "Matching Engine",
    aliases: ["08 — Matching Engine — CORE", "Matching Engine — CORE", "Matching Engine CORE", "Matching Engine", "07 — Underwriting Engine — CORE", "Underwriting Engine — CORE"],
  },
  {
    key: "buy-boxes",
    title: "06 — Buy Boxes & Mandates — CORE",
    entityType: "Buy Boxes / Mandates",
    aliases: [
      "06 — Buy Boxes & Mandates — CORE",
      "06 Buy Boxes & Mandates CORE",
      "Buy Boxes & Mandates — CORE",
      "Buy Boxes and Mandates CORE",
      "Brad — CORE Buy Boxes",
      "Brad CORE Buy Boxes",
      "Buy Boxes — CORE",
      "Buy Boxes CORE",
      "Buy Boxes",
      "Mandates",
    ],
  },
  {
    key: "active-signals",
    title: "Active Buy Box Signals",
    entityType: "Active Signals",
    aliases: ["📡 Active Buy Box Signals — Brad", "Active Buy Box Signals — Brad", "Active Buy Box Signals", "Brad-Scoped Buy Boxes & Matches Only"],
  },
  {
    key: "documents",
    title: "Documents & Diligence",
    entityType: "Documents / Diligence",
    aliases: ["Documents & Diligence", "Partner Documents", "Diligence", "Documents"],
  },
  {
    key: "support",
    title: "Support Requests",
    entityType: "Support Requests",
    aliases: ["Support Requests", "Support — Brad", "Requests — Brad", "Support"],
  },
];

const firstResolvedDataSource = async (aliases: string[]) => {
  for (const alias of aliases) {
    const id = await resolveDataSourceIdByTitle(alias).catch(() => "");
    if (id) return id;
  }
  return "";
};

const adminField = (fields: Record<string, string>, names: string[]) => getField(fields, names);

const adminStatusFromFields = (fields: Record<string, string>) =>
  adminField(fields, ["status", "submission status", "asset status", "review status", "approval", "stage", "current stage"]) || "Open";

const adminRowFromPage = (page: PageObjectResponse, sourceTitle: string, entityType: string): AdminCrmRow => {
  const fields = pageProperties(page);
  return {
    id: page.id,
    title: titleFromFields(fields) || adminField(fields, ["submission name", "asset name", "name", "title", "match name", "mandate name"]) || "SBF WORLD Record",
    entityType,
    sourceTitle,
    status: adminStatusFromFields(fields),
    owner: adminField(fields, ["submitted by", "partner name", "owner / contact", "owner", "assigned partner", "contact", "name"]),
    partnerScope: adminField(fields, ["partner scope", "scope", "assigned portal", "portal", "partner visibility"]),
    email: adminField(fields, ["submitted email", "email", "contact email", "partner email", "login email"]),
    contactId: adminField(fields, ["contact id", "contact", "member id"]),
    role: adminField(fields, ["role", "relationship type", "portal role", "access profile", "portal type"]),
    value: adminField(fields, ["budget", "value", "price", "capital", "amount", "purchase price"]),
    geography: adminField(fields, ["geography", "market", "location", "region"]),
    assetClass: adminField(fields, ["asset class", "asset type", "pillar", "type", "category"]),
    route: adminField(fields, ["route", "workflow route", "core route", "routing", "next action"]),
    updated: adminField(fields, ["last updated", "updated", "updated at", "last edited time", "submitted at", "created time"]),
    fields,
  };
};

const adminRowFromBlueprintModule = (module: AdminBlueprintModule): AdminCrmRow => {
  const fields = {
    ...module.fields,
    "SBF WORLD Module": module.title,
    "SBF WORLD Module Type": module.type,
    "SBF WORLD Open URL": module.openUrl,
    "Visible Rows": String(module.recordCount),
    "Visible Blocks": String(module.blockCount),
  };

  return {
    id: module.pageId || module.id,
    title: module.title || "SBF WORLD Blueprint Module",
    entityType: module.category || "God Blueprint Module",
    sourceTitle: "God’s Blueprint OS",
    status: adminStatusFromFields(fields) || module.status,
    owner: adminField(fields, ["submitted by", "partner name", "owner / contact", "owner", "assigned partner", "contact", "name"]),
    partnerScope: adminField(fields, ["partner scope", "scope", "assigned portal", "portal", "partner visibility"]),
    email: adminField(fields, ["submitted email", "email", "contact email", "partner email", "login email"]),
    contactId: adminField(fields, ["contact id", "contact", "member id"]),
    role: adminField(fields, ["role", "relationship type", "portal role", "access profile", "portal type"]),
    value: adminField(fields, ["budget", "value", "price", "capital", "amount", "purchase price"]),
    geography: adminField(fields, ["geography", "market", "location", "region"]),
    assetClass: adminField(fields, ["asset class", "asset type", "pillar", "type", "category"]),
    route: adminField(fields, ["route", "workflow route", "core route", "routing", "next action"]),
    updated: adminField(fields, ["last updated", "updated", "updated at", "last edited time", "submitted at", "created time"]),
    fields,
  };
};

const uniqueAdminRows = (rows: AdminCrmRow[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = stripDashes(row.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function assertAdminAccess(email: string) {
  const user = await findApprovedPortalUser(email, "admin");
  if (!user || user.role !== "admin" || !isAdminEmail(user.email)) {
    throw new NotionConfigError("Admin access requires Crystal or Aly with Full System Access.");
  }
  return user;
}

export async function getAdminCrmSnapshot(email: string): Promise<AdminCrmSnapshot> {
  const admin = await assertAdminAccess(email);
  const [users, blueprint] = await Promise.all([
    getPeopleUsersFromDataSource().catch(() => []),
    getGodBlueprintAdminSnapshot().catch(() => ({
      pageId: optionalEnv("NOTION_GODS_BLUEPRINT_PAGE_ID"),
      title: "God’s Blueprint",
      openUrl: "",
      modules: [],
      totals: { modules: 0, pages: 0, dataSources: 0, records: 0, blocks: 0 },
    } satisfies AdminBlueprintSnapshot)),
  ]);

  const settledSources = await Promise.allSettled(
    adminSourceTargets.map(async (target) => {
      const dataSourceId = target.key === "submissions"
        ? await getPartnerSubmissionsDataSourceId().catch(() => "")
        : await firstResolvedDataSource(target.aliases);
      if (!dataSourceId) {
        return {
          key: target.key,
          title: target.title,
          entityType: target.entityType,
          dataSourceId: "",
          rows: [],
        } satisfies AdminCrmSource;
      }

      const pages = await getDatabaseRows(dataSourceId);
      return {
        key: target.key,
        title: target.title,
        entityType: target.entityType,
        dataSourceId,
        rows: pages.map((page) => adminRowFromPage(page, target.title, target.entityType)),
      } satisfies AdminCrmSource;
    }),
  );

  const sources = settledSources.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          key: adminSourceTargets[index].key,
          title: adminSourceTargets[index].title,
          entityType: adminSourceTargets[index].entityType,
          dataSourceId: "",
          rows: [],
        },
  );

  const blueprintRows = blueprint.modules.map(adminRowFromBlueprintModule);
  const rows = uniqueAdminRows([...sources.flatMap((source) => source.rows), ...blueprintRows]);
  const normalizedStatus = (row: AdminCrmRow) => row.status.toLowerCase();

  return {
    admin,
    sources,
    rows,
    users,
    blueprint,
    totals: {
      users: users.length,
      partners: users.filter((user) => user.role === "partner").length,
      investors: users.filter((user) => user.role === "investor").length,
      lenders: users.filter((user) => user.role === "lender").length,
      submissions: rows.filter((row) => /submission|add to my matches|matching request/i.test(`${row.entityType} ${row.sourceTitle} ${row.route} ${getField(row.fields, ["request action", "request", "submission type"])}`)).length,
      assets: sources.find((source) => source.key === "assets")?.rows.length ?? 0,
      buyBoxes: sources.find((source) => source.key === "buy-boxes")?.rows.length ?? 0,
      matches: sources.find((source) => source.key === "matching")?.rows.length ?? 0,
      pendingReview: rows.filter((row) => ["new", "pending", "review", "in review", "needs review", "needs docs"].some((status) => normalizedStatus(row).includes(status))).length,
      approved: rows.filter((row) => ["approved", "active", "verified", "cleared", "full reveal approved"].some((status) => normalizedStatus(row).includes(status))).length,
      locked: rows.filter((row) => ["locked", "project locked", "closed"].some((status) => normalizedStatus(row).includes(status))).length,
      fullRevealRequests: rows.filter((row) => normalizeComparable(row.route + " " + row.title + " " + row.entityType + " " + Object.values(row.fields).join(" ")).includes("full reveal")).length,
      totalRows: rows.length,
    },
  };
}

const statusUpdateAliases = ["Status", "Submission Status", "Asset Status", "Review Status", "Approval", "Portal Status", "Project Status", "Lock Status", "Admin Review Status", "Full Reveal Status", "Reveal Status", "Admin Decision"];

const updatePropertyForExistingType = (property: PageObjectResponse["properties"][string], value: string) => {
  switch (property.type) {
    case "status":
      return statusProperty(value);
    case "select":
      return selectProperty(value);
    case "multi_select":
      return multiSelectProperty(value);
    case "checkbox":
      return { checkbox: truthyValue(value) };
    default:
      return richTextProperty(value);
  }
};

export async function updateAdminCrmRowStatus(adminEmail: string, rowId: string, status: string) {
  await assertAdminAccess(adminEmail);
  const notion = getNotionClient();
  const page = await notion.pages.retrieve({ page_id: rowId });

  if (!isPageObject(page)) {
    throw new NotionConfigError("The requested CRM row could not be opened.");
  }

  const existingFields = pageProperties(page);
  const existingRequestAction = getField(existingFields, ["request action", "request", "submission type"]);
  const isMatchingRequest = /add to my matches|matching request/i.test(existingRequestAction);
  const matchingDataSourceId = isMatchingRequest
    ? await firstResolvedDataSource(["08 — Matching Engine — CORE", "08 Matching Engine CORE", "Matching Engine — CORE"]).catch(() => "")
    : "";
  const pageDataSourceId = page.parent.type === "data_source_id" ? page.parent.data_source_id : "";
  // Use the actual parent source. Submission databases can contain match-score or
  // visibility columns too, and the old schema-based guess incorrectly treated
  // those submissions as if they were already promoted to the Matching Engine.
  const isPendingMatchingRecord = Boolean(
    isMatchingRequest && matchingDataSourceId && stripDashes(pageDataSourceId) === stripDashes(matchingDataSourceId),
  );

  const statusKey =
    statusUpdateAliases.find((alias) => page.properties[alias]) ||
    Object.keys(page.properties).find((key) => statusUpdateAliases.some((alias) => normalizeComparable(key) === normalizeComparable(alias))) ||
    Object.keys(page.properties).find((key) => normalizeComparable(key).includes("status"));

  if (!statusKey) {
    const blocks = await getPageBlocks(rowId).catch(() => []);
    const detailFields: Record<string, string> = {};
    blocks.map(normalizeBlock).filter((block): block is NotionContentBlock => Boolean(block?.text)).forEach((block) => {
      const separator = block.text!.indexOf(":");
      if (separator > 0) detailFields[block.text!.slice(0, separator).trim()] = block.text!.slice(separator + 1).trim();
    });
    const fallbackRequest = `${detailFields.Request || ""} ${detailFields["Submission Type"] || ""}`;
    const fallbackEmail = detailFields.Email || detailFields["Submitted Email"] || "";
    if (/matching request|add to my matches/i.test(fallbackRequest) && fallbackEmail) {
      if (/approved/i.test(status)) {
        await createBruceMatchRequest(fallbackEmail, {
          buyBoxId: detailFields["Buy Box ID"] || "",
          assetId: detailFields["Asset ID"] || "",
          assetName: detailFields.Asset || detailFields["Asset Name"] || "Approved investor match",
          buyBoxName: detailFields["Buy Box"] || "Selected mandate",
          market: detailFields.Market || detailFields.Geography || "",
          assetType: detailFields["Asset Type"] || detailFields["Asset Class"] || "",
          price: detailFields.Price || "",
          score: detailFields["Match Score"] || "",
          sourcePartner: detailFields["Source Partner Lane"] || "",
          approvalStatus: "Approved",
        });
      }
      const statusBlock = blocks.find((block) => normalizeComparable(blockText(block)).startsWith("status "));
      if (statusBlock && statusBlock.type === "paragraph") {
        await notion.blocks.update({
          block_id: statusBlock.id,
          paragraph: { rich_text: [{ type: "text", text: { content: `Status: ${status}` } }] },
        } as any);
      } else {
        await notion.blocks.children.append({ block_id: rowId, children: [notionParagraph(`Status: ${status}`)] as any });
      }
      return { id: rowId, status, statusKey: "page block" };
    }
    throw new NotionConfigError("This SBF WORLD row does not have a status/review property and is not a recoverable match request.");
  }

  const updatedProperties: Record<string, unknown> = {
    [statusKey]: updatePropertyForExistingType(page.properties[statusKey], status),
  };

  // Keep the partner notification bar reliable by also updating the admin-decision/reveal/lock fields
  // whenever those properties exist. Notion databases vary wildly because civilization made choices.
  Object.entries(page.properties).forEach(([key, property]) => {
    const normalized = normalizeComparable(key);
    if (key === statusKey) return;

    const shouldMirrorDecision = [
      "admin decision",
      "approval decision",
      "partner notification",
      "review outcome",
    ].some((label) => normalized.includes(label));

    const shouldMirrorReveal = status.toLowerCase().includes("reveal") && normalized.includes("reveal");
    const shouldMirrorLock = status.toLowerCase().includes("locked") && (normalized.includes("lock") || normalized.includes("project status"));
    const shouldApproveMatchVisibility = isPendingMatchingRecord && /approved/i.test(status) && normalized.includes("visibility");

    if (shouldMirrorDecision || shouldMirrorReveal || shouldMirrorLock || shouldApproveMatchVisibility) {
      updatedProperties[key] = updatePropertyForExistingType(property, shouldApproveMatchVisibility ? "Approved" : status);
    }
  });

  const timestamp = new Date().toISOString();
  Object.entries(page.properties).forEach(([key, property]) => {
    const normalized = normalizeComparable(key);
    if (["last updated", "updated", "admin updated", "reviewed at"].some((label) => normalized.includes(label))) {
      updatedProperties[key] = updatePropertyForExistingType(property, timestamp);
    }
  });

  if (isPendingMatchingRecord && /approved/i.test(status)) {
    const identityKey = Object.keys(page.properties).find((key) =>
      /related notes|notes|match reason|comments|investor scope|portal scope|submitted by/i.test(key) &&
      ["rich_text", "url", "email", "phone_number"].includes(page.properties[key]?.type ?? ""),
    ) || Object.keys(page.properties).find((key) => page.properties[key]?.type === "rich_text");
    if (identityKey) {
      updatedProperties[identityKey] = updatePropertyForExistingType(page.properties[identityKey], "Bruce Edwards | Eden Elevations 3 | bruce@edenelevations3.com | Add to My Matches");
    }
  }

  await notion.pages.update({
    page_id: rowId,
    properties: updatedProperties as any,
  });

  const requestAction = getField(existingFields, ["request action", "request", "submission type"]);
  const submittedEmail = getField(existingFields, ["submitted email", "email", "partner email"]);
  // Keep this idempotent and self-healing: approving an already-approved
  // submission again must still promote it if an earlier deployment missed it.
  if (/approved/i.test(status) && !isPendingMatchingRecord && /add to my matches|matching request/i.test(requestAction) && submittedEmail) {
    const detailFields: Record<string, string> = {};
    const detailBlocks = await getPageBlocks(rowId).catch(() => []);
    detailBlocks.map(normalizeBlock).filter((block): block is NotionContentBlock => Boolean(block?.text)).forEach((block) => {
      const separator = block.text!.indexOf(":");
      if (separator > 0) detailFields[block.text!.slice(0, separator).trim()] = block.text!.slice(separator + 1).trim();
    });
    let metadata: Record<string, string> = {};
    try {
      metadata = JSON.parse(getField(existingFields, ["notes"]) || "{}") as Record<string, string>;
    } catch {
      metadata = {};
    }
    await createBruceMatchRequest(submittedEmail, {
      buyBoxId: metadata.buyBoxId || detailFields["Buy Box ID"] || "",
      assetId: getField(existingFields, ["target record id", "asset id"]) || detailFields["Asset ID"] || "",
      assetName: getField(existingFields, ["target record title", "asset / match / item name", "asset name"]) || detailFields.Asset || "Approved investor match",
      buyBoxName: metadata.buyBoxName || detailFields["Buy Box"] || "Selected mandate",
      market: getField(existingFields, ["geography", "market"]) || detailFields.Market,
      assetType: getField(existingFields, ["asset class", "asset type"]) || detailFields["Asset Type"],
      price: metadata.price || getField(existingFields, ["budget", "price", "value"]) || detailFields.Price,
      score: metadata.score || detailFields["Match Score"] || "",
      sourcePartner: metadata.sourcePartner || detailFields["Source Partner Lane"] || "",
    });
  }

  return { id: rowId, status, statusKey };
}

export interface InvestorManagerField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

export interface InvestorManagerSnapshot {
  source: "notion";
  sourceTitle: string;
  dataSourceId: string;
  fields: InvestorManagerField[];
  rows: PortalDatabaseRow[];
}

const investorSourceAliases = [
  "04 — Investors, Buyers & Lenders — CORE",
  "04 Investors Buyers Lenders CORE",
  "Investors, Buyers & Lenders — CORE",
  "Investors Buyers Lenders CORE",
];

const investorScopeAliases = [
  "Source Partner",
  "Partner Scope",
  "Partner",
  "Partner Name",
  "Relationship Owner",
  "Owner / Contact",
  "Owner",
  "Submitted By",
];

const investorContactAliases = [
  "Investor / Buyer Name",
  "Investor Name",
  "Buyer Name",
  "Lender Name",
  "Organization",
  "Company",
  "Name",
  "Title",
];

const editableInvestorPropertyTypes = new Set([
  "title",
  "rich_text",
  "select",
  "status",
  "multi_select",
  "email",
  "url",
  "date",
  "number",
  "checkbox",
  "phone_number",
]);

const investorFieldOptions = (property: NotionSchemaProperty) => {
  const config = property[property.type ?? ""] as { options?: Array<{ name?: string }> } | undefined;
  return (config?.options ?? []).map((option) => String(option.name ?? "")).filter(Boolean);
};

const assertInvestorManagerAccess = async (email: string) => {
  const user = await findApprovedPortalUser(email);
  if (!user || !["partner", "admin"].includes(user.role)) {
    throw new NotionConfigError("Investor management requires an active partner or admin account in God’s Blueprint.");
  }
  return user;
};

const investorDataSourceId = async () => {
  const id = await firstResolvedDataSource(investorSourceAliases);
  if (!id) {
    throw new NotionConfigError(
      "04 — Investors, Buyers & Lenders — CORE is not shared with the SBF WORLD Notion connection.",
    );
  }
  return id;
};

export async function getInvestorManagerSnapshot(email: string): Promise<InvestorManagerSnapshot> {
  const user = await assertInvestorManagerAccess(email);
  if (newBuildZoneEnabled()) {
    return {
      source: "notion",
      sourceTitle: "New Build Zone — 8/5/2026 / Bruce Edwards Investor Portal (Canonical)",
      dataSourceId: NEW_BUILD_BRUCE_INVESTOR_PAGE_ID,
      fields: [],
      rows: await canonicalBradInvestorRows(),
    };
  }
  const dataSourceId = await investorDataSourceId();
  const [dataSource, pages] = await Promise.all([
    retrieveDataSource(dataSourceId),
    getDatabaseRows(dataSourceId),
  ]);
  const schema = dataSource.properties ?? {};
  const titleKey = titleSchemaKey(schema);
  const fields = Object.entries(schema)
    .filter(([, property]) => editableInvestorPropertyTypes.has(property.type ?? ""))
    .map(([key, property]) => ({
      key,
      label: key,
      type: property.type ?? "rich_text",
      required: key === titleKey,
      options: investorFieldOptions(property),
    }));

  const rows = toPortalRows(pages, investorSourceAliases[0], user, true);
  return {
    source: "notion",
    sourceTitle: investorSourceAliases[0],
    dataSourceId,
    fields,
    rows,
  };
}

export async function createInvestorManagerRecord(email: string, values: Record<string, string>) {
  if (newBuildZoneEnabled()) {
    throw new NotionConfigError("Investor creation is locked to the New Build Zone canonical workflow; legacy Investors CORE writes are disabled.");
  }
  const user = await assertInvestorManagerAccess(email);
  const dataSourceId = await investorDataSourceId();
  const dataSource = await retrieveDataSource(dataSourceId);
  const schema = dataSource.properties ?? {};
  const titleKey = titleSchemaKey(schema);
  const cleanValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value ?? "").trim()]),
  );

  if (!titleKey || !cleanValues[titleKey]) {
    throw new NotionConfigError(`The required ${titleKey || "title"} field is missing.`);
  }

  const properties: Record<string, unknown> = {};
  const scopeKey = findSchemaKey(schema, investorScopeAliases);
  if (scopeKey && schema[scopeKey]?.type === "relation") {
    properties[scopeKey] = { relation: [{ id: user.id }] };
  } else if (scopeKey && editableInvestorPropertyTypes.has(schema[scopeKey]?.type ?? "")) {
    cleanValues[scopeKey] = [user.name, user.email, user.contactId].filter(Boolean).join(" | ");
  }

  Object.entries(cleanValues).forEach(([key, value]) => {
    const property = schema[key];
    if (!property || !editableInvestorPropertyTypes.has(property.type ?? "")) return;
    properties[key] = notionPropertyForType(property.type, value, key === titleKey);
  });

  const response = await createPageViaNotionApi({
    parent: { data_source_id: dataSourceId },
    properties,
    children: [
      notionHeading("SBF WORLD Investor Relationship"),
      notionParagraph(`Created from Brad Portal by ${user.name} (${user.email}).`),
      notionParagraph("Source of truth: God’s Blueprint / 04 — Investors, Buyers & Lenders — CORE."),
    ],
  });

  databaseRowsCache.delete(stripDashes(dataSourceId).toLowerCase());

  return { id: response.id, source: "notion" as const };
}

export async function archiveInvestorManagerRecord(email: string, rowId: string) {
  if (newBuildZoneEnabled()) {
    throw new NotionConfigError("Investor archiving is disabled for canonical New Build Zone investor pages.");
  }
  const user = await assertInvestorManagerAccess(email);
  const notion = getNotionClient();
  const page = await notion.pages.retrieve({ page_id: rowId });
  if (!isPageObject(page)) throw new NotionConfigError("The investor record could not be opened.");

  const fields = pageProperties(page);
  if (user.role !== "admin" && !rowBelongsToUser(fields, user, investorSourceAliases[0])) {
    throw new NotionConfigError("This investor is not assigned to the current partner.");
  }

  await notion.pages.update({ page_id: rowId, archived: true });
  databaseRowsCache.delete(stripDashes(await investorDataSourceId()).toLowerCase());
  return { id: rowId, archived: true, source: "notion" as const };
}

export async function createPartnerUnderwritingRecord(email: string, assetId: string) {
  const user = await findApprovedPortalUser(email);
  if (!user || !["partner", "admin"].includes(user.role)) throw new NotionConfigError("Creating underwriting requires an active partner or admin account.");
  const [underwritingId, assetSourceId] = await Promise.all([
    firstResolvedDataSource(["07 — Underwriting Engine — CORE", "07 Underwriting Engine CORE", "Underwriting Engine — CORE"]),
    firstResolvedDataSource(["05 — Assets — CORE", "05 Assets CORE", "Assets — CORE"]),
  ]);
  if (!underwritingId || !assetSourceId) throw new NotionConfigError("Assets CORE or Underwriting Engine CORE is not shared with the SBF WORLD connection.");
  const notion = getNotionClient();
  const [assetPage, dataSource, existingPages] = await Promise.all([
    notion.pages.retrieve({ page_id: assetId }), retrieveDataSource(underwritingId), getDatabaseRows(underwritingId),
  ]);
  if (!isPageObject(assetPage)) throw new NotionConfigError("The selected asset could not be opened.");
  const assetFields = pageProperties(assetPage);
  if (user.role !== "admin" && !rowBelongsToUser(assetFields, user, "05 — Assets — CORE")) throw new NotionConfigError("This asset is not assigned to the current partner.");
  const alreadyExists = existingPages.some((page) => {
    const fields = pageProperties(page);
    return Object.values(fields).some((value) => normalizeComparable(value).includes(normalizeComparable(assetId.replace(/-/g, "")))) ||
      normalizeComparable(getField(fields, ["asset", "related asset", "asset name", "opportunity"])) === normalizeComparable(titleFromFields(assetFields));
  });
  if (alreadyExists) throw new NotionConfigError("Underwriting already exists for this asset.");

  const schema = dataSource.properties ?? {};
  const titleKey = titleSchemaKey(schema);
  if (!titleKey) throw new NotionConfigError("Underwriting Engine CORE does not have a title property.");
  const assetTitle = titleFromFields(assetFields) || "SBF WORLD Asset";
  const properties: Record<string, unknown> = { [titleKey]: titleProperty(`${assetTitle} — Underwriting`) };
  const setRelation = (aliases: string[], id: string) => { const key = findSchemaKey(schema, aliases); if (key && schema[key]?.type === "relation") properties[key] = { relation: [{ id }] }; };
  const setValue = (aliases: string[], value: string) => { const key = findSchemaKey(schema, aliases); if (key && key !== titleKey && schema[key] && schema[key].type !== "relation") properties[key] = notionPropertyForType(schema[key].type, value); };
  setRelation(["Asset", "Related Asset", "Opportunity", "Subject Asset"], assetId);
  setRelation(["Related Partner", "Partner", "Source Partner", "Owner"], user.id);
  setValue(["Asset Name", "Opportunity Name", "Subject"], assetTitle);
  setValue(["Submitted By", "Partner Scope", "Portal Email"], [user.name, user.email, user.contactId].filter(Boolean).join(" | "));
  const statusKey = findSchemaKey(schema, ["Status", "Underwriting Status", "Stage"]);
  if (statusKey) {
    const options = investorFieldOptions(schema[statusKey]);
    const status = ["Not Started", "Requested", "New", "In Review", "Pending"].find((candidate) => options.some((option) => normalizeComparable(option) === normalizeComparable(candidate))) || (schema[statusKey].type === "rich_text" ? "Requested" : "");
    if (status) properties[statusKey] = notionPropertyForType(schema[statusKey].type, status);
  }
  const response = await createPageViaNotionApi({ parent: { data_source_id: underwritingId }, properties, children: [notionHeading("Partner Underwriting Request"), notionParagraph(`Create underwriting for ${assetTitle}.`), notionParagraph(`Requested by ${user.name} (${user.email}).`)] });
  return { id: response.id, title: `${assetTitle} — Underwriting`, status: "Requested", source: "notion" as const };
}

export async function createBradMatchRecord(
  email: string,
  input: { buyBoxId: string; assetId: string; score: number },
) {
  const user = await findApprovedPortalUser(email);
  if (!user || !["partner", "admin"].includes(user.role)) {
    throw new NotionConfigError("Creating a match requires an active Brad partner account.");
  }

  const [matchingDataSourceId, buyBoxDataSourceId, assetDataSourceId] = await Promise.all([
    firstResolvedDataSource(["08 — Matching Engine — CORE", "08 Matching Engine CORE", "Matching Engine — CORE"]),
    firstResolvedDataSource(["06 — Buy Boxes & Mandates — CORE", "06 Buy Boxes & Mandates CORE", "Buy Boxes & Mandates — CORE"]),
    firstResolvedDataSource(["05 — Assets — CORE", "05 Assets CORE", "Assets — CORE"]),
  ]);

  if (!matchingDataSourceId || !buyBoxDataSourceId || !assetDataSourceId) {
    throw new NotionConfigError("The matching, buy-box, or asset CORE database is not shared with the SBF WORLD connection.");
  }

  const notion = getNotionClient();
  const [dataSource, buyBoxPage, assetPage] = await Promise.all([
    retrieveDataSource(matchingDataSourceId),
    notion.pages.retrieve({ page_id: input.buyBoxId }),
    notion.pages.retrieve({ page_id: input.assetId }),
  ]);

  if (!isPageObject(buyBoxPage) || !isPageObject(assetPage)) {
    throw new NotionConfigError("The selected buy box or asset could not be opened in Notion.");
  }

  const buyBoxFields = pageProperties(buyBoxPage);
  const assetFields = pageProperties(assetPage);
  if (!isCompleteNewBuildAsset(assetFields)) {
    throw new NotionConfigError(
      "This asset is incomplete in New Build Zone and cannot enter the matching engine.",
    );
  }
  if (
    user.role !== "admin" &&
    (!rowBelongsToUser(buyBoxFields, user, "06 — Buy Boxes & Mandates — CORE") ||
      !rowBelongsToUser(assetFields, user, "05 — Assets — CORE"))
  ) {
    throw new NotionConfigError("The selected buy box or asset is not assigned to Brad.");
  }

  const schema = dataSource.properties ?? {};
  const properties: Record<string, unknown> = {};
  const titleKey = titleSchemaKey(schema);
  const buyBoxTitle = titleFromFields(buyBoxFields) || "Brad Buy Box";
  const assetTitle = titleFromFields(assetFields) || "SBF WORLD Asset";
  const matchTitle = `${buyBoxTitle} ↔ ${assetTitle}`;

  if (!titleKey) throw new NotionConfigError("08 — Matching Engine — CORE does not have a title property.");
  properties[titleKey] = titleProperty(matchTitle);

  const setSchemaValue = (aliases: string[], value: string) => {
    const key = findSchemaKey(schema, aliases);
    if (!key || key === titleKey || !schema[key]) return;
    properties[key] = notionPropertyForType(schema[key].type, value);
  };
  const setRelation = (aliases: string[], id: string) => {
    const key = findSchemaKey(schema, aliases);
    if (key && schema[key]?.type === "relation") properties[key] = { relation: [{ id }] };
  };

  setRelation(["Buy Box", "Related Buy Box", "Matched Buy Box", "Mandate"], input.buyBoxId);
  setRelation(["Asset", "Related Asset", "Matched Asset", "Opportunity"], input.assetId);
  setRelation(["Source Partner", "Partner", "Relationship Owner", "Owner"], user.id);
  setSchemaValue(["Match Score", "Fit Score", "Score", "Match %"], String(Math.max(1, Math.min(99, Math.round(input.score)))));
  setSchemaValue(["Buy Box Name", "Mandate Name"], buyBoxTitle);
  setSchemaValue(["Asset Name", "Opportunity Name"], assetTitle);
  setSchemaValue(["Source", "Match Source", "Created Via"], "Brad Portal Matching Engine");
  setSchemaValue(["Partner Scope", "Partner Name", "Submitted By"], [user.name, user.email, user.contactId].filter(Boolean).join(" | "));

  const statusKey = findSchemaKey(schema, ["Status", "Match Status", "Stage"]);
  if (statusKey && ["select", "status"].includes(schema[statusKey]?.type ?? "")) {
    const available = investorFieldOptions(schema[statusKey]);
    const preferred = ["New", "Proposed", "Pending Review", "Teaser", "Active"].find((status) =>
      available.some((option) => normalizeComparable(option) === normalizeComparable(status)),
    );
    if (preferred) properties[statusKey] = notionPropertyForType(schema[statusKey].type, preferred);
  }

  const response = await createPageViaNotionApi({
    parent: { data_source_id: matchingDataSourceId },
    properties,
    children: [
      notionHeading("Brad Portal Match"),
      notionParagraph(`Buy Box: ${buyBoxTitle}`),
      notionParagraph(`Matched Asset: ${assetTitle}`),
      notionParagraph(`Portal Fit Score: ${Math.max(1, Math.min(99, Math.round(input.score)))}/99`),
      notionParagraph(`Created by ${user.name} (${user.email}) from the live SBF WORLD matching engine.`),
    ],
  });

  return { id: response.id, title: matchTitle, source: "notion" as const };
}

export async function createBruceMatchRequest(
  email: string,
  input: {
    buyBoxId: string;
    assetId: string;
    assetName: string;
    buyBoxName: string;
    market?: string;
    assetType?: string;
    price?: string;
    score?: string;
    sourcePartner?: string;
    approvalStatus?: "Submitted for Review" | "Approved";
  },
) {
  const user = await findApprovedPortalUser(email);
  if (!user || !["investor", "admin"].includes(user.role)) {
    throw new NotionConfigError("Adding a match requires an active investor account.");
  }

  const matchingDataSourceId = await firstResolvedDataSource([
    "08 — Matching Engine — CORE",
    "08 Matching Engine CORE",
    "Matching Engine — CORE",
  ]);
  if (!matchingDataSourceId) {
    throw new NotionConfigError("The Matching Engine — CORE database is not shared with the SBF WORLD connection.");
  }

  const dataSource = await retrieveDataSource(matchingDataSourceId);
  const schema = dataSource.properties ?? {};
  const titleKey = titleSchemaKey(schema);
  if (!titleKey) throw new NotionConfigError("Matching Engine — CORE does not have a title property.");

  const properties: Record<string, unknown> = {
    [titleKey]: titleProperty(input.assetName || "Requested investor match"),
  };
  const setValue = (aliases: string[], value = "") => {
    if (!value) return;
    const key = findSchemaKey(schema, aliases);
    if (!key || key === titleKey || !schema[key]) return;
    const propertyType = schema[key].type;
    if (propertyType === "relation") return;
    if (propertyType === "status") {
      const options = investorFieldOptions(schema[key]);
      const selected = options.find((option) => normalizeComparable(option) === normalizeComparable(value)) ||
        (normalizeComparable(value).includes("approved")
          ? options.find((option) => /approved|active|cleared|teaser/i.test(option))
          : options.find((option) => /requested|submitted|pending|review|new/i.test(option)));
      if (!selected) return;
      properties[key] = notionPropertyForType(propertyType, selected);
      return;
    }
    properties[key] = notionPropertyForType(propertyType, value);
  };
  const setRelation = (aliases: string[], id: string) => {
    if (!id) return;
    const key = findSchemaKey(schema, aliases);
    if (key && schema[key]?.type === "relation") properties[key] = { relation: [{ id }] };
  };

  setRelation(["Buy Box", "Related Buy Box", "Matched Buy Box", "Mandate"], input.buyBoxId);
  setRelation(["Asset", "Related Asset", "Matched Asset", "Opportunity"], input.assetId);
  setValue(["Investor", "Investor Name", "Buyer"], "Bruce Edwards");
  setValue(["Investor Entity", "Related Investor Entity", "Entity", "Company"], "Eden Elevations 3");
  setValue(["Asset Name", "Opportunity Name", "Deal Name"], input.assetName);
  setValue(["Buy Box Name", "Mandate Name"], input.buyBoxName);
  setValue(["Market", "Geography", "Location"], input.market);
  setValue(["Asset Type", "Asset Class", "Property Type"], input.assetType);
  setValue(["Visible Value", "Purchase Price", "Deal Size", "Price", "Value"], input.price);
  setValue(["Match Score", "Fit Score", "Score", "Match %"], input.score);
  setValue(["Source Partner", "Partner", "Source Lane"], input.sourcePartner);
  setValue(["Request", "Request Type", "Action"], "Add to My Matches");
  const approvalStatus = input.approvalStatus || "Approved";
  setValue(["Portal Visibility", "Bruce Visibility", "Visibility"], approvalStatus === "Approved" ? "Approved" : "Requested");
  setValue(["Status", "Match Status", "Stage", "Approval Status"], approvalStatus);
  setValue(["Submitted By", "Partner Scope", "Investor Scope"], [user.name, user.email, user.contactId].filter(Boolean).join(" | "));
  const identityScope = `Bruce Edwards | Eden Elevations 3 | ${user.email} | Add to My Matches`;
  const scopeKey = Object.keys(schema).find((key) =>
    /related notes|notes|match reason|comments|investor scope|portal scope|submitted by/i.test(key) &&
    ["rich_text", "url", "email", "phone_number"].includes(schema[key]?.type ?? ""),
  ) || Object.keys(schema).find((key) => schema[key]?.type === "rich_text" && key !== titleKey);
  if (scopeKey && !properties[scopeKey]) properties[scopeKey] = notionPropertyForType(schema[scopeKey].type, identityScope);

  if (approvalStatus === "Approved") {
    const existingPages = await getDatabaseRows(matchingDataSourceId).catch(() => []);
    const existing = existingPages.find((page) => {
      const fields = pageProperties(page);
      const existingTitle = titleFromFields(fields);
      const existingAsset = getField(fields, ["asset name", "opportunity name", "deal name"]);
      return [existingTitle, existingAsset].some((value) => normalizeComparable(value) === normalizeComparable(input.assetName));
    });
    if (existing) {
      const notion = getNotionClient();
      await notion.pages.update({ page_id: existing.id, properties: properties as any });
      return { id: existing.id, title: input.assetName, status: approvalStatus, source: "notion" as const };
    }
  }

  const response = await createPageViaNotionApi({
    parent: { data_source_id: matchingDataSourceId },
    properties,
    children: [
      notionHeading("Investor Match Request"),
      notionParagraph(`${user.name} requested ${input.assetName} be added to My Matches.`),
      notionParagraph(`Investor: Bruce Edwards | Entity: Eden Elevations 3 | Match score: ${input.score || "Not provided"}`),
      notionParagraph("This request is visible in the investor pipeline while SBF WORLD reviews protected access and next steps."),
    ],
  });

  return { id: response.id, title: input.assetName, status: approvalStatus, source: "notion" as const };
}
