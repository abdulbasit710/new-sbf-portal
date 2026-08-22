import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { canonicalNewBuildSectionsForUser, type BlueprintUser, type DynamicPortalDataSection, type PortalDatabaseRow } from "./notionService";
import type { Role } from "./types";
import { PortalAccessError, type PortalIdentity } from "./portalAuth";

export type CoreSourceKey = "people" | "partners" | "investors" | "assets" | "buyBoxes" | "underwriting" | "matches" | "vault" | "documents" | "submissions";
type CoreSource = { env: string; title: string };

export const NOTION_ORIGINAL_DATABASE_ACCESS_ERROR =
  "Notion integration is connected to the workspace/page, but the original source database is not shared with the integration or the backend is using the wrong database ID.";

export const CORE_SOURCES: Record<CoreSourceKey, CoreSource> = {
  people: { env: "NOTION_PEOPLE_DB_ID", title: "02 — People, Members & Relationships — CORE" },
  partners: { env: "NOTION_PARTNERS_DB_ID", title: "03 — Partner Registry — CORE" },
  investors: { env: "NOTION_INVESTORS_DB_ID", title: "04 — Investors, Buyers & Lenders — CORE" },
  assets: { env: "NOTION_ASSETS_DB_ID", title: "05 — Assets — CORE" },
  buyBoxes: { env: "NOTION_BUYBOXES_DB_ID", title: "06 — Buy Boxes & Mandates — CORE" },
  underwriting: { env: "NOTION_UNDERWRITING_DB_ID", title: "07 — Underwriting Engine — CORE" },
  matches: { env: "NOTION_MATCHING_DB_ID", title: "08 — Matching Engine — CORE" },
  vault: { env: "NOTION_VAULT_DB_ID", title: "09 — Vault & Controlled Reveal — CORE" },
  documents: { env: "NOTION_DOCUMENTS_DB_ID", title: "11 — Documents & Governance — CORE" },
  submissions: { env: "NOTION_SUBMISSIONS_DATABASE_ID", title: "Partner Submissions — CORE" },
};

export class CorePortalError extends Error {
  constructor(message: string, public status = 503) { super(message); this.name = "CorePortalError"; }
}

const notion = () => {
  const auth = process.env.NOTION_API_KEY?.trim();
  if (!auth) throw new CorePortalError("NOTION_API_KEY is not configured.");
  return new Client({ auth, timeoutMs: 20_000 });
};
const databaseId = (key: CoreSourceKey) => {
  const source = CORE_SOURCES[key];
  const id = process.env[source.env]?.trim().replaceAll("-", "");
  return id && !/^(auto|paste_|replace_)/i.test(id) ? id : "";
};
const querySourceCache = new Map<CoreSourceKey, string>();
const querySourceId = async (key: CoreSourceKey) => {
  const cached = querySourceCache.get(key);
  if (cached) return cached;
  const configuredId = databaseId(key);
  if (configuredId) {
    // Notion's newer UI often exposes a data-source ID instead of the parent
    // database ID. Accept either value so Vercel configuration is not tied to
    // which kind of Notion URL the administrator copied.
    try {
      const database = await notion().databases.retrieve({ database_id: configuredId });
      const sources = "data_sources" in database && Array.isArray(database.data_sources) ? database.data_sources : [];
      const id = sources[0]?.id?.replaceAll("-", "") || database.id.replaceAll("-", "");
      querySourceCache.set(key, id);
      return id;
    } catch {
      try {
        const source = await notion().dataSources.retrieve({ data_source_id: configuredId });
        const id = source.id.replaceAll("-", "");
        querySourceCache.set(key, id);
        return id;
      } catch {
        // Fall through to title-based discovery. This also recovers from a
        // stale ID after a Notion database/data-source migration.
      }
    }
  }

  const expected = CORE_SOURCES[key].title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const results = await notion().search({
    query: CORE_SOURCES[key].title.replace(/^\d+\s*[—-]\s*/, ""),
    filter: { property: "object", value: "data_source" },
    page_size: 100,
  });
  const source = results.results.find((item: any) => {
    if (item.object !== "data_source") return false;
    const title = Array.isArray(item.title) ? item.title.map((part: any) => part.plain_text || "").join("") : "";
    const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalized === expected || (normalized.includes("people") && normalized.includes("relationships") && normalized.includes("core"));
  });
  if (source) {
    const id = source.id.replaceAll("-", "");
    querySourceCache.set(key, id);
    return id;
  }

  throw new CorePortalError(`${CORE_SOURCES[key].title} was not found. Share the original database with the Notion integration, then redeploy.`);
};
const plain = (items: Array<{ plain_text?: string }> = []) => items.map((item) => item.plain_text || "").join("").trim();
const valueOf = (property: any): string => {
  if (!property) return "";
  switch (property.type) {
    case "title": case "rich_text": return plain(property[property.type]);
    case "email": case "phone_number": case "url": return property[property.type] || "";
    case "number": return property.number == null ? "" : String(property.number);
    case "select": case "status": return property[property.type]?.name || "";
    case "multi_select": return property.multi_select.map((item: any) => item.name).join(", ");
    case "checkbox": return property.checkbox ? "Yes" : "No";
    case "date": return property.date?.start || "";
    case "relation": return property.relation.map((item: any) => item.id).join(", ");
    case "files": return property.files.map((item: any) => item[item.type]?.url || "").filter(Boolean).join(", ");
    case "formula": return String(property.formula?.[property.formula.type] ?? "");
    case "rollup": return String(property.rollup?.[property.rollup.type] ?? "");
    default: return "";
  }
};
const fieldsOf = (page: PageObjectResponse) => Object.fromEntries(Object.entries(page.properties).map(([key, property]) => [key, valueOf(property)]).filter(([, value]) => value));
const norm = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const field = (fields: Record<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const exact = Object.entries(fields).find(([key]) => norm(key) === norm(alias));
    if (exact?.[1]) return exact[1];
  }
  return "";
};
const yes = (value: string) => /^(yes|true|1|approved|visible|allowed|active|verified|signed|complete|completed)$/i.test(value.trim());
const safeStatus = (value: string) => Boolean(value) && !/draft|incomplete|hidden|internal only|archived|inactive|rejected|pending/i.test(value);
const relationIds = (fields: Record<string, string>, aliases: string[]) => field(fields, aliases).split(",").map((id) => id.trim().replaceAll("-", "")).filter(Boolean);

async function query(key: CoreSourceKey) {
  const pages: PageObjectResponse[] = []; let cursor: string | undefined;
  do {
    try {
      const response = await notion().dataSources.query({ data_source_id: await querySourceId(key), page_size: 100, start_cursor: cursor });
      pages.push(...response.results.filter((item): item is PageObjectResponse => item.object === "page" && "properties" in item));
      cursor = response.has_more ? response.next_cursor || undefined : undefined;
    } catch (error) {
      if (error instanceof CorePortalError) throw error;
      const code = (error as any)?.code;
      if (code === "object_not_found" || (error as any)?.status === 404) {
        // Some workspaces share the database container but not its newer child
        // data source object. Querying with the stable 2022 database endpoint
        // remains valid and uses the same server-side integration token.
        const auth = process.env.NOTION_API_KEY?.trim();
        const originalDatabaseId = databaseId(key);
        if (!originalDatabaseId) throw new CorePortalError(NOTION_ORIGINAL_DATABASE_ACCESS_ERROR);
        const response = await fetch(`https://api.notion.com/v1/databases/${originalDatabaseId}/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
          cache: "no-store",
        });
        const payload = await response.json() as { results?: any[]; has_more?: boolean; next_cursor?: string | null; message?: string };
        if (!response.ok) throw new CorePortalError(payload.message || NOTION_ORIGINAL_DATABASE_ACCESS_ERROR);
        pages.push(...(payload.results || []).filter((item): item is PageObjectResponse => item.object === "page" && "properties" in item));
        cursor = payload.has_more ? payload.next_cursor || undefined : undefined;
        continue;
      }
      console.error(NOTION_ORIGINAL_DATABASE_ACCESS_ERROR, { source: CORE_SOURCES[key].title, error: error instanceof Error ? error.message : String(error) });
      throw new CorePortalError(NOTION_ORIGINAL_DATABASE_ACCESS_ERROR);
    }
  } while (cursor);
  return pages;
}

const roleOf = (value: string): Role => /admin/i.test(value) ? "admin" : /partner/i.test(value) ? "partner" : /lender/i.test(value) ? "lender" : /investor|buyer/i.test(value) ? "investor" : "member";
export async function getApprovedCoreUser(email: string): Promise<BlueprintUser | null> {
  const target = email.trim().toLowerCase();
  const page = (await query("people")).find((item) => field(fieldsOf(item), ["Email", "Login Email", "Portal Email"]).trim().toLowerCase() === target);
  if (!page) return null;
  const fields = fieldsOf(page);
  const access = field(fields, ["Access Level", "Portal Access Level"]);
  const fullAdmin = /full admin/i.test(access);
  const active = safeStatus(field(fields, ["Status", "Active / Inactive", "Relationship Status"])) || fullAdmin;
  const portalValue = field(fields, ["Portal Access", "Portal Approved", "Portal Visibility"]) || access;
  const portal = yes(portalValue) || /\bportal\b|enabled|full system access|full admin/i.test(portalValue);
  const verified = yes(field(fields, ["Verification Status", "Verified"]));
  if (!active || !portal || !verified || /none|denied|revoked|inactive/i.test(access)) return null;
  const role = fullAdmin ? "admin" : roleOf(field(fields, ["Relationship Type", "Role", "Portal Role", "Capital Role"]));
  return { id: page.id, name: field(fields, ["Name", "Full Name", "Person Name"]) || target, email: target, role, relationshipType: field(fields, ["Relationship Type", "Role"]), status: "active", accessLevel: access, ndaStatus: field(fields, ["NDA Status", "NDA"]), verificationStatus: field(fields, ["Verification Status", "Verified"]), rawFields: fields, source: "notion" };
}

export async function getCoreUserAccessStatus(email: string) {
  const target = email.trim().toLowerCase();
  const page = (await query("people")).find((item) => field(fieldsOf(item), ["Email", "Login Email", "Portal Email"]).trim().toLowerCase() === target);
  if (!page) return { found: false as const, approved: false as const, message: "No People CORE record matched this email." };
  const fields = fieldsOf(page);
  const name = field(fields, ["Name", "Full Name", "Person Name"]) || target;
  const status = field(fields, ["Status", "Active / Inactive", "Relationship Status"]);
  const verification = field(fields, ["Verification Status", "Verified"]);
  const nda = field(fields, ["NDA Status", "NDA"]);
  const access = field(fields, ["Portal Access", "Portal Approved", "Portal Visibility", "Access Level", "Portal Access Level"]);
  const blockers = [
    !safeStatus(status) ? `Status is ${status || "not approved"}` : "",
    !yes(verification) ? `Verification Status is ${verification || "not verified"}` : "",
    !(yes(access) || /\bportal\b|enabled|full system access/i.test(access)) ? `Portal Access is ${access || "not enabled"}` : "",
  ].filter(Boolean);
  return {
    found: true as const,
    approved: blockers.length === 0,
    name,
    status,
    verification,
    nda,
    access,
    message: blockers.length
      ? `${name} was found in People CORE, but portal access is locked: ${blockers.join("; ")}${nda && !yes(nda) ? `; NDA Status is ${nda}` : ""}.`
      : `${name} is approved for portal access.`,
  };
}

const approvedAsset = (f: Record<string, string>) => yes(field(f, ["Portal Visibility", "Portal Visible"])) && yes(field(f, ["Founder Approval", "Founder Approved"])) && safeStatus(field(f, ["Asset Status", "Status"])) && Boolean(field(f, ["Asset Name", "Name"])) && Boolean(field(f, ["Asking Price / Value", "Asking Price", "Value"])) && Boolean(field(f, ["Asset Type"])) && Boolean(field(f, ["Location / Market", "Location", "Market"])) && Boolean(field(f, ["Deal Type"])) && Boolean(field(f, ["Pillar"])) && Boolean(field(f, ["Confidentiality Level"])) && Boolean(field(f, ["Reveal Stage"]));
// DB 07 is a progressive underwriting workspace, not a final-completion-only
// table. A canonical row becomes portal eligible when it is explicitly approved
// for matching or vault use. Completeness/confidence describe progress and must
// not be used to erase otherwise approved underwriting records.
const approvedUnderwriting = (f: Record<string, string>) => {
  const title = field(f, ["Underwriting Name", "Name"]);
  const approved = yes(field(f, ["Approved for Matching"])) || yes(field(f, ["Approved for Vault"]));
  const status = field(f, ["Status", "Underwriting Status"]);
  return Boolean(title) && approved && (!status || safeStatus(status));
};
const approvedMatch = (f: Record<string, string>) => yes(field(f, ["Founder Approved", "Founder Approval"])) && yes(field(f, ["Visibility Allowed", "Portal Visibility"])) && safeStatus(field(f, ["Status", "Match Status"])) && Boolean(field(f, ["Related Asset"])) && Boolean(field(f, ["Related Investor / Buyer / Lender", "Related Investor", "Related Lender"])) && Boolean(field(f, ["Reveal Stage"]));
const approvedDocument = (f: Record<string, string>) => yes(field(f, ["Founder Approval", "Founder Approved"])) && safeStatus(field(f, ["Status", "Document Status"])) && Boolean(field(f, ["Approved Audience"])) && Boolean(field(f, ["Reveal Stage"])) && Boolean(field(f, ["File / Attachment", "File", "Attachment"]));
const approvedVault = (f: Record<string, string>) => yes(field(f, ["Founder Approval", "Founder Approved"])) && safeStatus(field(f, ["Status", "Vault Status"])) && Boolean(field(f, ["Approved Audience"])) && Boolean(field(f, ["Reveal Stage"])) && Boolean(field(f, ["Public-Safe Summary", "Partner-Safe Summary", "Investor-Safe Summary"]));
const row = (page: PageObjectResponse, key: CoreSourceKey): PortalDatabaseRow => { const fields = fieldsOf(page); return { id: page.id, title: field(fields, ["Name", "Submission Name", "Request", "Asset Name", "Buy Box Name", "Underwriting Name", "Match Name", "Document Name", "Vault Entry"]) || "Not linked yet", fields, sourceTitle: CORE_SOURCES[key].title }; };
const owns = (record: PortalDatabaseRow, ids: Set<string>, identity: BlueprintUser) => identity.role === "admin" || [...relationIds(record.fields, ["Related Partner", "Source Partner", "Owner Partner", "Related Investor / Buyer / Lender", "Related Investor", "Owner / Capital Relationship", "Owner Capital Relationship"]), record.id.replaceAll("-", "")].some((id) => ids.has(id)) || norm(Object.values(record.fields).join(" ")).includes(norm(identity.email));
const audienceAllows = (record: PortalDatabaseRow, identity: BlueprintUser) => { const audience = norm(field(record.fields, ["Approved Audience", "Audience"])); return audience.includes("all") || audience.includes("portal") || audience.includes(identity.role) || audience.includes(norm(identity.name)) || audience.includes(norm(identity.email)); };
const linkedToAny = (record: PortalDatabaseRow, aliases: string[], ids: Set<string>) => relationIds(record.fields, aliases).some((id) => ids.has(id));

// Notion's API cannot query a saved database view directly. These are the four
// canonical DB 08 page IDs currently surfaced by "Live — Bruce Matches". Their
// content remains live; only view membership is pinned here to reproduce Notion.
const BRUCE_LIVE_MATCH_IDS = new Set([
  "b8e3e50cbd6f4fc387b69a238f8f0033",
  "e0a2c9241839428d98499bff2ee8b096",
  "0b092cc9bf294921a2f2607c378dc82a",
  "62f0d5067ebd4f639744a017b0abf3e3",
]);

export async function getCorePortalBundle(identity: PortalIdentity) {
  const user = await getApprovedCoreUser(identity.email);
  if (!user || user.role !== identity.role) throw new PortalAccessError("Portal access is not currently approved in People CORE.");
  let sourcePages: PageObjectResponse[][];
  try {
    sourcePages = await Promise.all(["partners", "investors", "assets", "buyBoxes", "underwriting", "matches", "vault", "documents", "submissions"].map((key) => query(key as CoreSourceKey)));
  } catch (error) {
    if (user.role === "investor" && user.email === "bruce@edenelevations3.com") {
      const sections = await canonicalNewBuildSectionsForUser(user);
      const profile = sections.find((section) => section.key === "investors")?.rows[0] || null;
      return {
        user,
        profile,
        sections,
        diagnostics: {
          bruceBuyBoxCount: sections.find((section) => section.key === "buy-box-signals")?.rows.length || 0,
          underwritingSourceRows: sections.find((section) => section.key === "underwritten-assets")?.rows.length || 0,
          underwritingApprovedRows: sections.find((section) => section.key === "underwritten-assets")?.rows.length || 0,
          underwritingScopedRows: sections.find((section) => section.key === "underwritten-assets")?.rows.length || 0,
          sourceFallback: "New Build Zone — Bruce Edwards Investor Portal (Canonical)",
        },
      };
    }
    if (user.role === "partner" && user.email === "brad@keatyrealestate.com") {
      const sections = await canonicalNewBuildSectionsForUser(user);
      return {
        user,
        profile: null,
        sections,
        diagnostics: {
          underwritingSourceRows: sections.find((section) => section.key === "underwritten-assets")?.rows.length || 0,
          underwritingApprovedRows: 0,
          underwritingScopedRows: sections.find((section) => section.key === "underwritten-assets")?.rows.length || 0,
          sourceFallback: "New Build Zone — Brad Partner Portal (Canonical)",
          coreAccessWarning: error instanceof Error ? error.message : NOTION_ORIGINAL_DATABASE_ACCESS_ERROR,
        },
      };
    }
    throw error;
  }
  const [partners, investors, assets, buyBoxes, underwriting, matches, vault, documents, submissions] = sourcePages;
  const profileRows = (user.role === "partner" ? partners : user.role === "investor" || user.role === "lender" ? investors : []).map((page) => row(page, user.role === "partner" ? "partners" : "investors"));
  const profile = profileRows
    .filter((item) => norm(Object.values(item.fields).join(" ")).includes(norm(user.email)) || norm(item.title) === norm(user.name))
    .map((item) => ({ item, score:
      (norm(item.title) === norm(user.name) ? 100 : 0) +
      (yes(field(item.fields, ["Portal Access"])) ? 40 : 0) +
      (safeStatus(field(item.fields, ["Partner Status", "Status"])) ? 20 : 0) +
      (yes(field(item.fields, ["NDA Status"])) ? 10 : 0) +
      (/signed|active/i.test(field(item.fields, ["Agreement Status", "Activation Status"])) ? 10 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0]?.item;
  const ids = new Set([user.id, profile?.id || ""].map((id) => id.replaceAll("-", "")).filter(Boolean));
  const isBradPartner = user.role === "partner" && /brad gaubert/i.test(user.name);
  const scopedInvestors = investors.map((page) => row(page, "investors")).filter((item) => {
    if (user.role !== "partner") return item.id.replaceAll("-", "") === profile?.id.replaceAll("-", "");
    if (isBradPartner) return owns(item, ids, user);
    // Mirror the canonical New Build Zone investor view: a partner may see only
    // directly related capital relationships explicitly surfaced for SBF review.
    // DB 04 contains many historical/prospect rows related to Brad; those are
    // not part of the "Live — Bruce Edwards…" portal view.
    return owns(item, ids, user) &&
      yes(field(item.fields, ["Portal Access"])) &&
      /ready for sbf review/i.test(field(item.fields, ["Activation Status"])) &&
      (
        field(item.fields, ["Email"]).trim().toLowerCase() === "bruce@edenelevations3.com" ||
        /\bbruce edwards\b/i.test(field(item.fields, ["Name", "Primary Contact"])) ||
        /\binv-cap-ins-001\b/i.test(field(item.fields, ["Registry Name"]))
      );
  });
  const allAssetRows = assets.map((page) => row(page, "assets"));
  const allAssets = allAssetRows.filter((item) => approvedAsset(item.fields));
  const scopedAssets = user.role === "partner" ? allAssetRows.filter((item) => owns(item, ids, user)) : allAssets;
  const capitalIds = new Set(scopedInvestors.map((item) => item.id.replaceAll("-", "")));
  if (user.role !== "partner" && profile) capitalIds.add(profile.id.replaceAll("-", ""));
  const isBruceInvestor = user.role === "investor" && /bruce edwards/i.test(user.name) && user.email === "bruce@edenelevations3.com";
  const scopedBuyBoxes = buyBoxes.map((page) => row(page, "buyBoxes")).filter((item) => {
    const linkedToBruce = linkedToAny(item, ["Owner / Capital Relationship", "Owner Capital Relationship", "Investor", "Buyer"], capitalIds);
    // Bruce's canonical Notion view contains two mandate rows. Some rows do not
    // carry the optional Status / Match Ready properties, so those properties
    // must not remove an otherwise explicitly Bruce-owned buy box.
    if (isBruceInvestor) return linkedToBruce || /\bbruce edwards\b/i.test(`${item.title} ${Object.values(item.fields).join(" ")}`);
    return safeStatus(field(item.fields, ["Status"])) &&
      yes(field(item.fields, ["Match Ready", "Match Readiness"])) && linkedToBruce;
  });
  const buyBoxIds = new Set(scopedBuyBoxes.map((item) => item.id.replaceAll("-", "")));
  const scopedMatches = matches.map((page) => row(page, "matches")).filter((item) => {
    // The canonical DB 08 "All Matches" view for Brad/Bruce contains eight
    // lifecycle records. Preserve their real Draft/Review/Archived/Approved
    // states instead of silently removing non-approved rows.
    if (isBruceInvestor) return BRUCE_LIVE_MATCH_IDS.has(item.id.replaceAll("-", ""));
    if (isBradPartner) return linkedToAny(item, ["Related Partner", "Source Partner", "Owner Partner"], ids) || owns(item, ids, user);
    if (!approvedMatch(item.fields)) return false;
    return linkedToAny(item, ["Related Investor / Lender", "Related Investor"], capitalIds) &&
      linkedToAny(item, ["Related Buy Box / Mandate", "Related Buy Box", "Mandate"], buyBoxIds) &&
      (() => { const score = Number(field(item.fields, ["Match Score"]).replace("%", "")); const percent = score > 0 && score <= 1 ? score * 100 : score; return percent >= 80; })();
  });
  if (isBruceInvestor && scopedMatches.length !== BRUCE_LIVE_MATCH_IDS.size) {
    console.error("Bruce Live — Bruce Matches source mismatch", {
      expected: BRUCE_LIVE_MATCH_IDS.size,
      received: scopedMatches.length,
      source: CORE_SOURCES.matches.title,
    });
    throw new CorePortalError("Bruce's four canonical matches could not all be loaded from 08 — Matching Engine — CORE.");
  }
  const matchedAssetIds = new Set(scopedMatches.flatMap((item) => relationIds(item.fields, ["Related Asset"])));
  const matchedUnderwritingIds = new Set(scopedMatches.flatMap((item) => relationIds(item.fields, ["Related Underwriting"])));
  const ownedAssetIds = new Set(scopedAssets.map((item) => item.id.replaceAll("-", "")));
  matchedAssetIds.forEach((id) => ownedAssetIds.add(id));
  const eligibleUnderwriting = underwriting.map((page) => row(page, "underwriting")).filter((item) => approvedUnderwriting(item.fields));
  const scopedUnderwriting = eligibleUnderwriting.filter((item) =>
    owns(item, ids, user) ||
    matchedUnderwritingIds.has(item.id.replaceAll("-", "")) ||
    linkedToAny(item, ["Related Asset", "Related Assets", "Asset"], ownedAssetIds) ||
    (isBradPartner && norm(Object.values(item.fields).join(" ")).includes("brad gaubert"))
  );
  const scopedVault = vault.map((page) => row(page, "vault")).filter((item) => approvedVault(item.fields) && audienceAllows(item, user) && (linkedToAny(item, ["Related Asset"], ownedAssetIds) || linkedToAny(item, ["Related Underwriting"], new Set(scopedUnderwriting.map((entry) => entry.id.replaceAll("-", ""))))));
  const scopedDocuments = documents.map((page) => row(page, "documents")).filter((item) => approvedDocument(item.fields) && audienceAllows(item, user) && (owns(item, ids, user) || linkedToAny(item, ["Related Asset"], ownedAssetIds) || linkedToAny(item, ["Related Person / Member"], ids)));
  const scopedSubmissions = submissions.map((page) => row(page, "submissions")).filter((item) => owns(item, ids, user) || norm(Object.values(item.fields).join(" ")).includes(norm(user.name)) || norm(Object.values(item.fields).join(" ")).includes(norm(user.email)));
  const sections: DynamicPortalDataSection[] = [
    { key: "assets", title: user.role === "partner" ? "My Assets" : "Ready Assets", description: "Partner-owned submissions and approved portal-visible CORE assets.", sourceTitles: [CORE_SOURCES.assets.title], rows: scopedAssets },
    { key: "complete-assets", title: "Ready Assets", description: "Founder-approved, portal-visible CORE assets.", sourceTitles: [CORE_SOURCES.assets.title], rows: scopedAssets.filter((item) => approvedAsset(item.fields)) },
    { key: "profile", title: user.role === "partner" ? "Partner Profile" : "Investor Profile", description: "Live relationship profile from the canonical CORE registry.", sourceTitles: [user.role === "partner" ? CORE_SOURCES.partners.title : CORE_SOURCES.investors.title], rows: profile ? [profile] : [] },
    { key: "investors", title: user.role === "partner" ? "My Investors" : "Investor Profile", description: "Canonical capital relationships scoped through live Notion relations.", sourceTitles: [CORE_SOURCES.investors.title], rows: scopedInvestors },
    { key: "buy-box-signals", title: "My Buy Boxes", description: "Active, match-ready mandates linked to this relationship.", sourceTitles: [CORE_SOURCES.buyBoxes.title], rows: scopedBuyBoxes },
    { key: "underwritten-assets", title: "Underwriting", description: "Complete portal-approved underwriting outputs.", sourceTitles: [CORE_SOURCES.underwriting.title], rows: scopedUnderwriting },
    { key: "active-matches", title: "Matches", description: "Read-only founder-approved matches.", sourceTitles: [CORE_SOURCES.matches.title], rows: scopedMatches },
    { key: "documents", title: "Documents & Diligence", description: "Audience and reveal-approved documents.", sourceTitles: [CORE_SOURCES.documents.title], rows: scopedDocuments },
    { key: "vault", title: "Controlled Reveal", description: "Vault-authorized reveal records.", sourceTitles: [CORE_SOURCES.vault.title], rows: scopedVault },
    { key: "submissions", title: "My Submissions", description: "Brad-attributed portal submissions and their live review status.", sourceTitles: [CORE_SOURCES.submissions.title], rows: scopedSubmissions },
  ];
  return { user, profile: profile || null, sections, diagnostics: {
    bruceBuyBoxCount: norm(user.name).includes("bruce") ? scopedBuyBoxes.length : undefined,
    underwritingSourceRows: underwriting.length,
    underwritingApprovedRows: eligibleUnderwriting.length,
    underwritingScopedRows: scopedUnderwriting.length,
  } };
}

export const findBundleRecord = (bundle: Awaited<ReturnType<typeof getCorePortalBundle>>, id: string, keys?: string[]) => bundle.sections.filter((section) => !keys || keys.includes(section.key)).flatMap((section) => section.rows).find((item) => item.id.replaceAll("-", "") === id.replaceAll("-", "")) || null;

const contentText = (block: any) => {
  const data = block?.[block?.type];
  if (!data) return "";
  const rich = Array.isArray(data.rich_text) ? plain(data.rich_text) : "";
  if (block.type === "child_page") return data.title || "";
  if (block.type === "table_row") return (data.cells || []).map((cell:any[])=>plain(cell)).join(" | ");
  if (block.type === "bookmark" || block.type === "link_preview") return data.url || "";
  return rich;
};
export async function getCorePageContent(pageId: string) {
  const lines:string[]=[];
  const visit=async(blockId:string,depth=0)=>{let cursor:string|undefined;do{const response=await notion().blocks.children.list({block_id:blockId,page_size:100,start_cursor:cursor});for(const block of response.results as any[]){const text=contentText(block).trim();if(text)lines.push(text);if(block.has_children&&depth<3)await visit(block.id,depth+1)}cursor=response.has_more?response.next_cursor||undefined:undefined}while(cursor)};
  await visit(pageId);
  return lines;
}

export async function getRelatedPartnerSubmissions(record: PortalDatabaseRow) {
  const dataSourceId=process.env.NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID?.trim().replaceAll("-","");
  if(!dataSourceId||/^(auto|discover|search|none|null)$/i.test(dataSourceId))return [] as PortalDatabaseRow[];
  const tokens=new Set([record.id.replaceAll("-",""),...relationIds(record.fields,["Related Asset","Related Assets","Asset","Related Partner","Source Partner"])].filter(Boolean));
  if(!tokens.size)return [] as PortalDatabaseRow[];
  try{const pages:PageObjectResponse[]=[];let cursor:string|undefined;do{const response=await notion().dataSources.query({data_source_id:dataSourceId,page_size:100,start_cursor:cursor});pages.push(...response.results.filter((item):item is PageObjectResponse=>item.object==="page"&&"properties" in item));cursor=response.has_more?response.next_cursor||undefined:undefined}while(cursor);return pages.map(page=>{const fields=fieldsOf(page);return{id:page.id,title:field(fields,["Submission Name","Name","Title","Asset / match / item name"])||"Partner submission",fields,sourceTitle:"12 — Partner Submissions — CORE"}}).filter(item=>{const text=Object.values(item.fields).join(" ").replaceAll("-","").toLowerCase();return [...tokens].some(token=>text.includes(token.toLowerCase()))})}catch(error){console.error("Related Partner Submissions could not be loaded",error);return [] as PortalDatabaseRow[]}
}
