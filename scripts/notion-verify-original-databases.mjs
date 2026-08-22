import fs from "node:fs";
import { Client } from "@notionhq/client";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
  const [key, ...parts] = clean.split("=");
  if (!(key in process.env)) process.env[key] = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
}

const auth = process.env.NOTION_API_KEY?.trim();
if (!auth) throw new Error("NOTION_API_KEY is not configured.");
const notion = new Client({ auth, timeoutMs: 12_000, retry: false });
const failureMessage = "Notion integration is connected to the workspace/page, but the original source database is not shared with the integration or the backend is using the wrong database ID.";
const databases = [
  ["NOTION_PEOPLE_DB_ID", "02 — People, Members & Relationships — CORE"],
  ["NOTION_PARTNERS_DB_ID", "03 — Partner Registry — CORE"],
  ["NOTION_INVESTORS_DB_ID", "04 — Investors, Buyers & Lenders — CORE"],
  ["NOTION_ASSETS_DB_ID", "05 — Assets — CORE"],
  ["NOTION_BUYBOXES_DB_ID", "06 — Buy Boxes & Mandates — CORE"],
  ["NOTION_UNDERWRITING_DB_ID", "07 — Underwriting Engine — CORE"],
  ["NOTION_MATCHING_DB_ID", "08 — Matching Engine — CORE"],
  ["NOTION_VAULT_DB_ID", "09 — Vault & Controlled Reveal — CORE"],
  ["NOTION_DOCUMENTS_DB_ID", "11 — Documents & Governance — CORE"],
];

let failed = false;
for (const [envName, title] of databases) {
  const databaseId = process.env[envName]?.trim().replaceAll("-", "");
  if (!databaseId || /^(auto|paste_|replace_)/i.test(databaseId)) {
    failed = true;
    console.error(`FAIL  ${title} — ${envName} is missing.`);
    console.error(failureMessage);
    continue;
  }
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const sources = Array.isArray(database.data_sources) ? database.data_sources : [];
    console.log(`PASS  ${title} — database=${database.id.replaceAll("-", "")} query_source=${sources[0]?.id?.replaceAll("-", "") || "legacy database ID"}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${title} — ${error instanceof Error ? error.message : String(error)}`);
    console.error(failureMessage);
  }
}

if (failed) process.exitCode = 1;
