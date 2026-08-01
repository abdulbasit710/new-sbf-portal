import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...rawValueParts] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValueParts.join("=").trim().replace(/^['"]|['"]$/g, "");

    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(envPath);

const token = process.env.NOTION_API_KEY;
const query = process.argv.slice(2).join(" ").trim();

if (!token || token.startsWith("replace_with_")) {
  console.error("Missing NOTION_API_KEY. Add your Notion secret to .env.local first.");
  process.exit(1);
}

async function notionRequest(pathname, body) {
  const response = await fetch(`https://api.notion.com/v1${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || response.statusText;
    throw new Error(`Notion API error ${response.status}: ${message}`);
  }

  return payload;
}

function getTitle(item) {
  if (item.title && Array.isArray(item.title)) {
    return item.title.map((part) => part.plain_text || "").join("").trim();
  }

  if (item.properties) {
    const titleProperty = Object.values(item.properties).find((property) => property?.type === "title");
    if (titleProperty?.title) {
      return titleProperty.title.map((part) => part.plain_text || "").join("").trim();
    }
  }

  if (item.object === "database") return item.description?.[0]?.plain_text || "Untitled database";
  return "Untitled";
}

function getUsefulId(item) {
  return item.id?.replaceAll("-", "") || "";
}

try {
  const payload = await notionRequest("/search", {
    query: query || undefined,
    page_size: 20,
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
  });

  const results = payload.results || [];

  if (!results.length) {
    console.log("No shared Notion pages, databases, or data sources found for this token.");
    console.log("In Notion, open your page/database, click Share or the ... menu, then add the SBF WORLD Platform connection.");
    process.exit(0);
  }

  console.log("Shared Notion content found:\n");

  for (const item of results) {
    console.log(`Title: ${getTitle(item)}`);
    console.log(`Object: ${item.object}`);
    console.log(`ID: ${getUsefulId(item)}`);
    console.log(`Last edited: ${item.last_edited_time || "Unknown"}`);
    console.log("---");
  }

  console.log("\nUse a data_source ID for NOTION_SITE_CONTENT_DATA_SOURCE_ID when available.");
  console.log("Use a data_source ID for NOTION_PEOPLE_DATA_SOURCE_ID when you see 02 — People, Members & Relationships — CORE.");
  console.log("Use a page ID for NOTION_GODS_BLUEPRINT_PAGE_ID.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
