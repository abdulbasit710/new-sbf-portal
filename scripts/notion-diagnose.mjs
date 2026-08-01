import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValueParts] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const token = process.env.NOTION_API_KEY;
if (!token || token.startsWith("replace_with_")) {
  console.error("❌ NOTION_API_KEY is missing in .env.local");
  process.exit(1);
}

const email = process.argv[2]?.trim();
const url = email
  ? `http://localhost:3000/api/notion/health?email=${encodeURIComponent(email)}`
  : "http://localhost:3000/api/notion/health";

console.log("Run npm run dev in another terminal first, then open:");
console.log(url);
console.log("\nQuick direct Notion search test...");

try {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ query: "02 People Members Relationships CORE", page_size: 10 }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || response.statusText);
  console.log(`✅ Notion reachable. Results returned: ${(payload.results || []).length}`);
  for (const item of payload.results || []) {
    const title = item.title?.map?.((x) => x.plain_text || "").join("") ||
      Object.values(item.properties || {}).find((p) => p?.type === "title")?.title?.map?.((x) => x.plain_text || "").join("") ||
      "Untitled";
    console.log(`- ${item.object}: ${title} (${String(item.id || "").replaceAll("-", "")})`);
  }
} catch (error) {
  console.error("❌ Notion direct search failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
