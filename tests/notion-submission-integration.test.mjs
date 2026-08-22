import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(new URL("../lib/notionService.ts", import.meta.url), "utf8");
const submitRoute = fs.readFileSync(new URL("../app/api/notion/portal/submit/route.ts", import.meta.url), "utf8");
const workflowRoute = fs.readFileSync(new URL("../app/api/notion/deal-workflow/route.ts", import.meta.url), "utf8");
const healthRoute = fs.readFileSync(new URL("../app/api/deploy/health/route.ts", import.meta.url), "utf8");

test("submission writes require the environment database destination", () => {
  assert.match(service, /NOTION_SUBMISSIONS_DATABASE_ID/);
  assert.match(service, /databases\.retrieve\(\{ database_id: databaseId \}\)/);
  assert.match(service, /notion\.pages\.create\(\{/);
  assert.match(service, /parent: \{ database_id: databaseId \}/);
});

test("underwriting reads and writes use 07 CORE environment configuration", () => {
  assert.match(service, /NOTION_UNDERWRITING_DATABASE_ID/);
  assert.match(service, /queryOriginalDatabaseRows\(underwritingId\)/);
  assert.match(service, /\/underwriting\/i\.test\(submissionType\)/);
});

test("submission writes do not fall back to a parent page", () => {
  const submissionFunction = service.slice(service.indexOf("export async function createPartnerPortalSubmission"), service.indexOf("export async function getDynamicPortalForEmail"));
  assert.doesNotMatch(submissionFunction, /parent:\s*\{\s*page_id/);
  assert.doesNotMatch(submissionFunction, /NOTION_GODS_BLUEPRINT_PAGE_ID/);
});

test("submission APIs return the sanitized integration message", () => {
  assert.match(submitRoute, /NOTION_SUBMISSION_PUBLIC_ERROR/);
  assert.match(workflowRoute, /NOTION_SUBMISSION_PUBLIC_ERROR/);
});

test("Bruce underwriting remains available when Notion audit or live 07 query fails", () => {
  assert.match(workflowRoute, /NDA audit write failed; underwriting access will continue/);
  assert.match(workflowRoute, /canonicalNewBuildSectionsForUser\(user\)/);
  assert.match(workflowRoute, /Bruce Edwards — Investor Portal \(Canonical\)/);
});

test("deployment health reports submission env presence without exposing its value", () => {
  assert.match(healthRoute, /envStatus\("NOTION_SUBMISSIONS_DATABASE_ID"\)/);
  assert.doesNotMatch(healthRoute, /process\.env\.NOTION_SUBMISSIONS_DATABASE_ID/);
});
