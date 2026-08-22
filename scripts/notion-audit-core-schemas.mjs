import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [key, ...parts] = trimmed.split("=");
  if (!(key in process.env)) process.env[key] = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
}

const token = process.env.NOTION_API_KEY;
const root = process.env.NOTION_NEW_BUILD_ZONE_PAGE_ID;
const countsOnly = process.argv.includes("--counts-only");
if (!token || !root) throw new Error("Missing NOTION_API_KEY or NOTION_NEW_BUILD_ZONE_PAGE_ID.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "Notion-Version": "2025-09-03",
};
const request = async (path, init) => {
  const response = await fetch(`https://api.notion.com/v1${path}`, { headers, ...init });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Notion ${response.status}`);
  return payload;
};
const text = (rich = []) => Array.isArray(rich) ? rich.map((item) => item.plain_text || "").join("").trim() : "";
const value = (property) => {
  if (!property) return "";
  const data = property[property.type];
  if (property.type === "title" || property.type === "rich_text") return text(data);
  if (property.type === "select" || property.type === "status") return data?.name || "";
  if (property.type === "multi_select") return data.map((item) => item.name).join(", ");
  if (property.type === "relation") return data.map((item) => item.id.replaceAll("-", "")).join(", ");
  if (property.type === "checkbox") return String(data);
  if (property.type === "number") return data == null ? "" : String(data);
  if (property.type === "email" || property.type === "url" || property.type === "phone_number") return data || "";
  return "";
};

const rootBlocks = await request(`/blocks/${root}/children?page_size=100`);
const canonical = rootBlocks.results.find((block) => block.type === "child_page" && /God.s Blueprint.*Canonical/i.test(block.child_page?.title || ""));
if (!canonical) throw new Error("Canonical God's Blueprint page was not found under New Build Zone.");
const blocks = await request(`/blocks/${canonical.id}/children?page_size=100`);
const sources = [];
for (const block of blocks.results.filter((item) => item.type === "child_database")) {
  const database = await request(`/databases/${block.id}`);
  const linked = database.data_sources || [];
  if (linked.length) {
    for (const source of linked) sources.push({ id: source.id, name: source.name || "Untitled" });
  }
}

{
  const fallbackSources = [
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
  ];
  fallbackSources.forEach(([name, id]) => {
    if (!sources.some((source) => source.name === name)) sources.push({ name, id });
  });
}

for (const source of sources) {
  let sourceId = source.id;
  let schema;
  try {
    schema = await request(`/data_sources/${sourceId}`);
  } catch {
    const found = await request("/search", { method: "POST", body: JSON.stringify({ query: source.name, page_size: 100 }) });
    const normalized = source.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const exact = (found.results || []).find((item) => {
      const title = item.title ? text(item.title) : text(Object.values(item.properties || {}).find((property) => property.type === "title")?.title);
      return item.object === "data_source" && title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized;
    });
    if (!exact) {
      console.log(`\nMISSING\t${source.name}\tNo exact shared data source found`);
      continue;
    }
    sourceId = exact.id;
    schema = await request(`/data_sources/${sourceId}`);
  }
  const rows = await request(`/data_sources/${sourceId}/query`, { method: "POST", body: JSON.stringify({ page_size: 100 }) });
  const properties = Object.entries(schema.properties || {}).map(([name, property]) => `${name} [${property.type}]`).join(" | ");
  console.log(`\nSOURCE\t${source.name}\t${sourceId.replaceAll("-", "")}\tROWS=${rows.results?.length || 0}${rows.has_more ? "+" : ""}`);
  if (!countsOnly) {
    console.log(`SCHEMA\t${properties}`);
    for (const page of (rows.results || []).slice(0, 3)) {
      const fields = Object.entries(page.properties || {}).map(([name, property]) => `${name}=${value(property)}`).filter((item) => !item.endsWith("=")).join(" | ");
      console.log(`ROW\t${page.id.replaceAll("-", "")}\t${fields}`);
    }
  }
}
