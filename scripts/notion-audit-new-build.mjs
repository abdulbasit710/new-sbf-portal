import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [key, ...parts] = trimmed.split("=");
  if (!(key in process.env)) process.env[key] = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
}

const token = process.env.NOTION_API_KEY;
const root = process.argv[2] || process.env.NOTION_NEW_BUILD_ZONE_PAGE_ID;
const verbose = Boolean(process.argv[2]);
if (!token || !root) throw new Error("Missing NOTION_API_KEY or NOTION_NEW_BUILD_ZONE_PAGE_ID.");

const headers = { Authorization: `Bearer ${token}`, "Notion-Version": "2025-09-03" };
const get = async (path) => {
  const response = await fetch(`https://api.notion.com/v1${path}`, { headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Notion ${response.status}`);
  return payload;
};

const text = (rich = []) => typeof rich === "string" ? rich.trim() : Array.isArray(rich) ? rich.map((item) => item.plain_text || "").join("").trim() : "";
const seen = new Set();

async function walk(id, depth = 0) {
  if (depth > 5 || seen.has(id)) return;
  seen.add(id);
  let cursor = "";
  do {
    const payload = await get(`/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`);
    for (const block of payload.results || []) {
      const body = block[block.type] || {};
      const title = body.title || body.caption ? text(body.title || body.caption) : text(body.rich_text);
      const linkedId = body.page_id || body.database_id || "";
      if (title && (verbose || /complete|required|match|asset|field|filter|ready/i.test(title))) {
        console.log(`${"  ".repeat(depth)}text\t${title}`);
      }
      if (verbose && !title) console.log(`${"  ".repeat(depth)}block\t${block.type}`);
      if (verbose && block.type === "code") console.log(JSON.stringify(body));
      if (["child_page", "child_database", "link_to_page", "synced_block"].includes(block.type)) {
        console.log(`${"  ".repeat(depth)}${block.type}\t${title || "(untitled)"}\t${block.id.replaceAll("-", "")}\t${String(linkedId).replaceAll("-", "")}`);
      }
      if (block.type === "child_database") {
        const database = await get(`/databases/${block.id}`).catch(() => null);
        if (database) console.log(`${"  ".repeat(depth + 1)}database\t${text(database.title) || "(untitled)"}\t${block.id.replaceAll("-", "")}\t${(database.data_sources || []).map((source) => `${source.name}:${source.id.replaceAll("-", "")}`).join(" | ")}`);
      }
      if (block.type === "child_page" && depth === 0 && /God.s Blueprint.*Canonical/i.test(title)) await walk(block.id, depth + 1);
      else if (verbose && block.has_children) await walk(block.id, depth + 1);
    }
    cursor = payload.has_more ? payload.next_cursor || "" : "";
  } while (cursor);
}

await walk(root);
