import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local. Create it before running the project.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...value] = line.split("=");
      return [key.trim(), value.join("=").trim().replace(/^[\'"]|[\'"]$/g, "")];
    }),
);

const required = [
  "NOTION_API_KEY",
  "NOTION_INTAKE_DATABASE_ID",
  "NOTION_PEOPLE_DATABASE_ID",
  "NOTION_PARTNERS_DATABASE_ID",
  "NOTION_INVESTORS_DATABASE_ID",
  "NOTION_ASSETS_DATABASE_ID",
  "NOTION_MANDATES_DATABASE_ID",
  "NOTION_UNDERWRITING_DATABASE_ID",
  "NOTION_MATCHING_DATABASE_ID",
  "NOTION_VAULT_DATABASE_ID",
  "NOTION_DEALS_DATABASE_ID",
  "NOTION_DOCUMENTS_DATABASE_ID",
  "NOTION_SUBMISSIONS_DATABASE_IDS",
  "NOTION_EVENTS_DATABASE_ID",
  "NOTION_PAYMENTS_DATABASE_ID",
  "NOTION_CIGARS_DATABASE_ID",
  "NOTION_PILLARS_DATABASE_ID",
];
const missing = required.filter((key) => !env[key] || env[key].startsWith("replace_with_"));

if (!env.NOTION_CORE_ROOT_PAGE_ID || env.NOTION_CORE_ROOT_PAGE_ID.startsWith("replace_with_")) {
  missing.unshift("NOTION_CORE_ROOT_PAGE_ID");
}

if (missing.length) {
  console.error(`Missing required env value(s): ${missing.join(", ")}`);
  process.exit(1);
}

if (!env.NOTION_SUBMISSIONS_DATABASE_ID || env.NOTION_SUBMISSIONS_DATABASE_ID.startsWith("replace_with_")) {
  console.warn("Warning: Missing NOTION_SUBMISSIONS_DATABASE_ID. The portal can start, but Teaser, Full Underwriting, NDA-consent, and LOI submissions will remain unavailable until the live Partner Submissions — CORE database ID is configured and shared with the Notion integration.");
}

console.log("Notion token found.");
console.log("Canonical CORE root and all Admin Portal source IDs found.");
console.log("Screen access-code login enabled. SMTP email setup is not required.");
