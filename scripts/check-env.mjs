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

const required = ["NOTION_API_KEY"];
const missing = required.filter((key) => !env[key] || env[key].startsWith("replace_with_"));

if (missing.length) {
  console.error(`Missing required env value(s): ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Notion token found.");
console.log(`People table source: ${env.NOTION_PEOPLE_DATA_SOURCE_ID || "auto"}`);
console.log("Screen access-code login enabled. SMTP email setup is not required.");
