const required = [
  "NOTION_API_KEY",
  "NOTION_GODS_BLUEPRINT_PAGE_ID",
];

const recommended = [
  "NOTION_PEOPLE_DATA_SOURCE_ID",
  "NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID",
  "NOTION_SITE_CONTENT_DATA_SOURCE_ID",
  "NOTION_PORTAL_USERS_DATA_SOURCE_ID",
  "OPENAI_API_KEY",
  "OPENAI_ASSISTANT_MODEL",
  "NOTION_ASSISTANT_PUBLIC_SOURCE_PAGE_ID",
];

const isConfigured = (value) => {
  if (!value) return false;
  const clean = String(value).trim();
  if (!clean) return false;
  if (clean.startsWith("replace_with_")) return false;
  if (clean.toLowerCase().startsWith("paste_")) return false;
  return true;
};

console.log("SBF WORLD Vercel environment check");
console.log("Never print or commit the actual NOTION_API_KEY value. This script only checks presence.\n");

let failed = false;
for (const key of required) {
  const ok = isConfigured(process.env[key]);
  console.log(`${ok ? "✅" : "❌"} ${key}: ${ok ? "configured" : "missing"}`);
  if (!ok) failed = true;
}

for (const key of recommended) {
  const raw = process.env[key];
  const ok = isConfigured(raw);
  const mode = ok && String(raw).toLowerCase() === "auto" ? "auto" : ok ? "configured" : "not set";
  console.log(`${ok ? "✅" : "⚠️"} ${key}: ${mode}`);
}

if (failed) {
  console.error("\nMissing required environment variables. Set them in Vercel Project → Settings → Environment Variables, then redeploy.");
  process.exit(1);
}

console.log("\nRequired Vercel variables are present. Test live Notion with /api/deploy/health?email=brad@keatyrealestate.com after deployment.");
