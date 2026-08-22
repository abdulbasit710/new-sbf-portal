import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(new URL("../lib/notion/coreDataService.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/admin/crm/route.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../lib/api/adminCrm.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../components/admin/AdminCrmPanel.tsx", import.meta.url), "utf8");

test("dashboard metrics come from the canonical service, not suspicious literals", () => {
  assert.match(route, /getCanonicalAdminCrmSnapshot/);
  for (const literal of ["64", "332", "262", "1336", "243", "259", "11652B"]) {
    assert.doesNotMatch(panel, new RegExp(`(?:value|total|count)[^\\n]{0,30}["']${literal}["']`, "i"));
  }
});

test("metric counts use complete paginated database query results", () => {
  assert.match(service, /page_size: 100/);
  assert.match(service, /while \(cursor\)/);
  assert.match(service, /successfulCounts\.reduce/);
});

test("all configured submission sources are aggregated and deduplicated", () => {
  assert.match(service, /NOTION_SUBMISSIONS_DATABASE_IDS/);
  assert.match(service, /sourceIds\.map/);
  assert.match(service, /new Map\(records\.map/);
});

test("refresh invalidates cache and forces a live refetch", () => {
  assert.match(client, /refresh=1/);
  assert.match(route, /invalidateCoreDataCache/);
  assert.match(route, /getCanonicalAdminCrmSnapshot\(email, refresh\)/);
});

test("source failures are visible and never replaced with fake metrics", () => {
  assert.match(route, /Live CORE data unavailable/);
  assert.match(panel, /setData\(null\)/);
  assert.match(panel, /failed sources/);
});

test("Admin OS renders only live per-source Notion results", () => {
  assert.match(panel, /Live Notion query/);
  assert.match(panel, /Unavailable — check Notion integration access/);
  assert.match(panel, /source\.count/);
  assert.doesNotMatch(panel, /metricLayers|CORE RAW|LIVE VIEW|AUDIT SAFE|10\+|50\+|20\+/);
  assert.doesNotMatch(service, /1222|441|781|rawCanonical|auditSafe/);
});
