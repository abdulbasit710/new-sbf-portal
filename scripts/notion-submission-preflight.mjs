import fs from "node:fs";
import { Client } from "@notionhq/client";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
  const [key, ...parts] = clean.split("=");
  if (!(key in process.env)) process.env[key] = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
}

const databaseId = (process.argv[2] || process.env.NOTION_SUBMISSIONS_DATABASE_ID || "").trim();
const token = process.env.NOTION_API_KEY?.trim();
if (!token) throw new Error("NOTION_API_KEY is missing.");
if (!databaseId) throw new Error("NOTION_SUBMISSIONS_DATABASE_ID is missing.");

const sanitized = `${databaseId.replaceAll("-", "").slice(0, 6)}…${databaseId.replaceAll("-", "").slice(-4)}`;
const notion = new Client({ auth: token, timeoutMs: 15_000, retry: false });
console.log(`NOTION_SUBMISSIONS_DATABASE_ID exists=true sanitized=${sanitized}`);

try {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  console.log(`database: PASS object=${database.object} dataSources=${Array.isArray(database.data_sources) ? database.data_sources.length : 0}`);
  if (!Array.isArray(database.data_sources) || database.data_sources.length === 0) {
    const queryResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify({ page_size: 1 }),
    });
    const queryPayload = await queryResponse.json().catch(() => ({}));
    console.log(queryResponse.ok
      ? `database query: PASS rowsSampled=${queryPayload.results?.length || 0}`
      : `database query: FAIL code=${queryPayload.code || queryResponse.status} message=${queryPayload.message || queryResponse.statusText}`);
  }
} catch (error) {
  console.log(`database: FAIL code=${error?.code || error?.status || "unknown"} message=${error?.message || String(error)}`);
}

try {
  const page = await notion.pages.retrieve({ page_id: databaseId });
  console.log(`page: PASS object=${page.object}`);
} catch (error) {
  console.log(`page: FAIL code=${error?.code || error?.status || "unknown"} message=${error?.message || String(error)}`);
}
