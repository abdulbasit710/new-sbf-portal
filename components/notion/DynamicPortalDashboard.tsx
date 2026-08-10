"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Card, { CardHeader } from "@/components/ui/Card";
import KpiWidget from "@/components/ui/KpiWidget";
import { Icon } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/Section";
import { useSession } from "@/lib/session";
import { isCompleteNewBuildAsset } from "@/lib/assetCompleteness";
import type {
  DynamicPortalBlock,
  DynamicPortalDataSection,
  DynamicPortalPage,
  PortalDatabaseRow,
} from "@/lib/notionService";

const fieldValue = (fields: Record<string, string>, names: string[]) => {
  const lower = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const name of names) {
    const exact = lower[name.toLowerCase()];
    if (exact) return exact;
  }

  const entry = Object.entries(lower).find(([key]) =>
    names.some((name) => key.includes(name.toLowerCase())),
  );
  return entry?.[1] ?? "";
};


const GENERIC_ROW_VALUES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "none",
  "no",
  "yes",
  "other",
  "unknown",
  "unspecified",
  "pending",
  "active",
  "matching active",
]);

const isGenericValue = (value: string) =>
  GENERIC_ROW_VALUES.has(value.trim().toLowerCase()) || value.trim().length <= 1;

const firstUsefulValue = (fields: Record<string, string>, names: string[]) => {
  for (const name of names) {
    const value = fieldValue(fields, [name]);
    if (value && !isGenericValue(value)) return value;
  }
  return "";
};

const sbfSourceLabel = (_source?: string) => "SBF WORLD";

const assetNameForRow = (row: PortalDatabaseRow) => {
  const title = firstUsefulValue(row.fields, [
    "asset name",
    "opportunity name",
    "deal name",
    "property name",
    "project name",
    "match name",
    "mandate name",
    "buy box name",
    "title",
    "name",
    "asset",
    "buy box",
    "mandate",
  ]);

  if (title) return title;
  if (row.title && !isGenericValue(row.title)) return row.title;

  const composed = [
    firstUsefulValue(row.fields, ["pillar", "asset class", "asset type", "market"]),
    firstUsefulValue(row.fields, ["geography", "location", "region"]),
  ].filter(Boolean).join(" — ");

  return composed || "SBF WORLD teaser opportunity";
};

const assetStatusForRow = (row: PortalDatabaseRow) =>
  firstUsefulValue(row.fields, ["asset status", "status", "stage", "current stage", "workflow stage"]) || "Teaser review";

const pillarForRow = (row: PortalDatabaseRow) =>
  firstUsefulValue(row.fields, ["pillar", "vertical", "sector", "market", "asset class"]) || "SBF WORLD";

const assetTypeForRow = (row: PortalDatabaseRow) =>
  firstUsefulValue(row.fields, ["asset type", "property type", "deal type", "asset class", "type"]) || "Partner-safe asset";

const geographyForRow = (row: PortalDatabaseRow) =>
  firstUsefulValue(row.fields, ["geography", "location", "region", "market", "country", "state"]);

const ndaForRow = (row: PortalDatabaseRow) =>
  fieldValue(row.fields, ["nda status", "nda", "nda requirement"]) || "NDA gated";

const hasFullRevealAccess = (row: PortalDatabaseRow) => {
  const signal = [
    fieldValue(row.fields, ["full reveal status", "reveal status", "approval", "admin decision", "status", "stage"]),
    fieldValue(row.fields, ["partner visibility", "portal visibility", "visibility"]),
  ].join(" ").toLowerCase();
  return /approved|cleared|full reveal|partner visible|unlocked|open/i.test(signal) && !/pending|requested|needs|review/i.test(signal);
};

const cleanLabel = (key: string) =>
  key
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const databaseColumns = (rows: PortalDatabaseRow[]) => {
  const cols: string[] = [];
  rows.forEach((row) => {
    Object.keys(row.fields).forEach((key) => {
      if (!cols.includes(key)) cols.push(key);
    });
  });

  const preferred = [
    "full name",
    "name",
    "title",
    "asset",
    "buy box",
    "mandate",
    "match",
    "status",
    "stage",
    "next step",
    "market",
    "geography",
    "asset type",
    "value",
    "price",
    "budget",
    "nda status",
    "proof of funds",
    "documents",
    "teaser",
    "full reveal",
    "updated",
    "last edited time",
  ];

  return cols.sort((a, b) => {
    const ai = preferred.findIndex((item) => a.includes(item));
    const bi = preferred.findIndex((item) => b.includes(item));
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

const parseAmount = (value: string) => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "—") return 0;

  const match = cleaned.match(/-?\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return 0;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;

  const suffix = cleaned.toLowerCase();
  if (suffix.includes("bn") || suffix.includes("billion") || suffix.endsWith("b")) return base * 1_000_000_000;
  if (suffix.includes("mm") || suffix.includes("million") || suffix.endsWith("m")) return base * 1_000_000;
  if (suffix.includes("k")) return base * 1_000;
  return base;
};

const compactMoney = (value: number) => {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${value.toLocaleString()}`;
};

const rowPrimaryLabel = (row: PortalDatabaseRow) => assetNameForRow(row);

const rowCapitalValue = (row: PortalDatabaseRow) =>
  parseAmount(fieldValue(row.fields, ["value", "price", "budget", "amount", "asking", "capital", "deal size", "size"]));

const groupRowsByField = (rows: PortalDatabaseRow[], fields: string[]) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const raw = fieldValue(row.fields, fields) || "Unspecified";
    raw
      .split(/[,|/]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
};

const sourceBreakdown = (rows: PortalDatabaseRow[]) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = sbfSourceLabel(row.sourceTitle);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
};

const chartRowsForPortal = (portal: DynamicPortalPage | null, keys?: string[]) => {
  const sections = keys?.length
    ? (portal?.sections ?? []).filter((section) => sectionMatches(section, keys))
    : portal?.sections ?? [];
  return sections.flatMap((section) => section.rows);
};

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-4 shadow-panel">
      <div className="label-mono text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-chalk">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function HorizontalBars({ title, subtitle, items }: { title: string; subtitle?: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} sub={subtitle} />
      <div className="space-y-3 p-5">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-chalk/80">{item.label}</span>
                <span className="font-mono text-gold">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-deep/60 via-gold to-gold-light shadow-[0_0_18px_rgba(200,162,74,0.25)]"
                  style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No chartable rows visible yet.</p>
        )}
      </div>
    </Card>
  );
}

function DonutSummary({ rows }: { rows: PortalDatabaseRow[] }) {
  const statuses = groupRowsByField(rows, ["status", "stage", "current stage"]).slice(0, 5);
  const total = Math.max(statuses.reduce((sum, item) => sum + item.value, 0), 1);
  let offset = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Status composition" sub="Partner-visible rows by stage/status" />
      <div className="grid gap-4 p-5 sm:grid-cols-[150px_1fr] sm:items-center">
        <div className="relative mx-auto h-[150px] w-[150px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            {statuses.map((item, index) => {
              const dash = (item.value / total) * circumference;
              const segment = (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className={["text-gold", "text-emerald-300", "text-sky-300", "text-amber-300", "text-white/50"][index] ?? "text-gold"}
                />
              );
              offset += dash;
              return segment;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold text-chalk">{rows.length}</div>
            <div className="label-mono text-muted">Records</div>
          </div>
        </div>
        <div className="space-y-2">
          {statuses.length ? (
            statuses.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs">
                <span className="truncate text-chalk/75">{item.label}</span>
                <span className="font-mono text-gold">{Math.round((item.value / total) * 100)}%</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No status data yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function SectionInsightPanel({ rows }: { rows: PortalDatabaseRow[] }) {
  const visibleValue = rows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const statuses = groupRowsByField(rows, ["status", "stage", "current stage"]);
  const topSources = sourceBreakdown(rows);
  const classes = groupRowsByField(rows, ["asset class", "asset type", "pillar", "interests", "market"]);

  return (
    <div className="border-b border-white/[0.05] bg-black/10 p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visible records" value={rows.length} sub="Brad-scoped rows only" />
        <MetricCard label="Estimated value" value={compactMoney(visibleValue)} sub="From visible amount/value fields" />
        <MetricCard label="Top status" value={statuses[0]?.label ?? "—"} sub={statuses[0] ? `${statuses[0].value} matching rows` : "No status fields"} />
        <MetricCard label="Sources" value={topSources.length} sub="Shared SBF WORLD sources" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <HorizontalBars title="Status / stage" subtitle="Workflow distribution" items={statuses} />
        <HorizontalBars title="Source volume" subtitle="Rows by SBF WORLD source" items={topSources} />
        <HorizontalBars title="Asset / market mix" subtitle="Top visible categories" items={classes} />
      </div>
    </div>
  );
}


const flattenPortalBlocks = (blocks: DynamicPortalBlock[]): DynamicPortalBlock[] =>
  blocks.flatMap((block) => [block, ...flattenPortalBlocks(block.children ?? [])]);

const rowsForSimpleTableBlock = (block: DynamicPortalBlock) =>
  (block.children ?? []).flatMap((child) => child.rows ?? []);

const findSimpleTableAfterHeading = (portal: DynamicPortalPage | null, headingMatch: string) => {
  const flat = flattenPortalBlocks(portal?.blocks ?? []);
  const normalizedHeading = headingMatch.toLowerCase();

  for (let index = 0; index < flat.length; index += 1) {
    const text = (flat[index].text ?? "").toLowerCase();
    if (!text.includes(normalizedHeading)) continue;

    const table = flat.slice(index + 1).find((block) => block.type === "table" && rowsForSimpleTableBlock(block).length);
    if (table) return rowsForSimpleTableBlock(table);
  }

  return [] as string[][];
};

const tableBodyRows = (rows: string[][]) =>
  rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .filter((row) => !row.every((cell) => /^[-—:\s]+$/.test(cell.trim())));

const parseCountCell = (value = "") => {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const parseMoneyCell = (value = "") => {
  const cleaned = value.replace(/,/g, "").trim().toLowerCase();
  const match = cleaned.match(/-?\$?\s*(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  if (cleaned.includes("bn") || cleaned.includes("billion") || cleaned.endsWith("b")) return base * 1_000_000_000;
  if (cleaned.includes("mm") || cleaned.includes("million") || cleaned.endsWith("m")) return base * 1_000_000;
  if (cleaned.includes("k")) return base * 1_000;
  return base;
};

const extractNotionCommandMetrics = (portal: DynamicPortalPage | null) => {
  const assetCommandRows = findSimpleTableAfterHeading(portal, "Asset Command");
  const pillarRows = findSimpleTableAfterHeading(portal, "Pillar Exposure");

  if (!assetCommandRows.length && !pillarRows.length) return null;

  const assetStatusRows = tableBodyRows(assetCommandRows)
    .map((row) => ({ label: row[0]?.trim() || "Unspecified", value: parseCountCell(row[1] ?? "") }))
    .filter((item) => item.value > 0 && item.label.toLowerCase() !== "total")
    .sort((a, b) => b.value - a.value);

  const totalRow = tableBodyRows(assetCommandRows).find((row) => row[0]?.trim().toLowerCase() === "total");
  const assetTotal = totalRow ? parseCountCell(totalRow[1] ?? "") : assetStatusRows.reduce((sum, item) => sum + item.value, 0);

  const pillarBreakdown = tableBodyRows(pillarRows)
    .map((row) => ({
      label: row[0]?.trim() || "Unclassified",
      value: parseCountCell(row[1] ?? ""),
      recordedValue: parseMoneyCell(row[2] ?? ""),
    }))
    .filter((item) => item.value > 0 || item.recordedValue > 0)
    .sort((a, b) => b.value - a.value);

  const recordedValue = pillarBreakdown.reduce((sum, item) => sum + item.recordedValue, 0);

  return {
    assetTotal,
    assetStatuses: assetStatusRows,
    topStatus: assetStatusRows[0]?.label ?? "—",
    topStatusCount: assetStatusRows[0]?.value ?? 0,
    pillarBreakdown,
    recordedValue,
    sourceLabel: "Partner Portal — Brad / Asset Command tables",
  };
};

function PortalChartOverview({ portal, view }: { portal: DynamicPortalPage | null; view: PortalView }) {
  const commandMetrics = view === "overview" ? extractNotionCommandMetrics(portal) : null;

  if (commandMetrics) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.035] px-4 py-3 text-xs leading-5 text-gold/90">
          Dashboard numbers are now taken from the visible SBF WORLD tables inside <span className="font-semibold text-gold">{commandMetrics.sourceLabel}</span>, not from a combined background count of every shared database row.
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Asset total" value={commandMetrics.assetTotal || "—"} sub="From Asset Command table" />
          <MetricCard label="Recorded value" value={compactMoney(commandMetrics.recordedValue)} sub="From Pillar Exposure table" />
          <MetricCard label="Top asset status" value={commandMetrics.topStatus} sub={commandMetrics.topStatusCount ? `${commandMetrics.topStatusCount} records` : "No status count"} />
          <MetricCard label="Source of truth" value="SBF WORLD" sub="Partner Portal — Brad tables" />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <HorizontalBars title="Asset status" subtitle="Exact count from SBF WORLD table" items={commandMetrics.assetStatuses} />
          <HorizontalBars title="Pillar exposure" subtitle="Brad-sourced asset count" items={commandMetrics.pillarBreakdown.map((item) => ({ label: item.label, value: item.value }))} />
          <HorizontalBars title="Recorded value mix" subtitle="Scaled from visible SBF WORLD values" items={commandMetrics.pillarBreakdown.map((item) => ({ label: item.label, value: Math.round(item.recordedValue / 1_000_000) })).filter((item) => item.value > 0)} />
        </div>
      </div>
    );
  }

  const viewKeys: Partial<Record<PortalView, string[]>> = {
    matches: ["active-matches", "deal-flow", "matching", "matches"],
    assets: ["assets", "buy-box-signals", "sbf vault", "signals"],
    underwriting: ["underwritten", "underwriting", "diligence", "documents"],
    "buy-box": ["buy-box", "buy box", "mandate", "signals"],
    "matching-engine": ["matching", "matching engine", "assets", "buy-box", "signals", "05 — assets", "08 — matching"],
    documents: ["documents", "diligence", "teaser", "full reveal"],
    support: ["support", "requests", "workflow"],
    intake: ["workflow", "routing", "command"],
  };
  const rows = chartRowsForPortal(portal, viewKeys[view]);
  const visibleValue = rows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const statuses = groupRowsByField(rows, ["status", "stage", "current stage"]);
  const sources = sourceBreakdown(rows);
  const assetClasses = groupRowsByField(rows, ["asset class", "asset type", "pillar", "market", "geography"]);

  if (!rows.length) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Live records" value={rows.length} sub="Filtered for this portal" />
        <MetricCard label="Visible capital" value={compactMoney(visibleValue)} sub="Only approved visible fields" />
        <MetricCard label="Primary status" value={statuses[0]?.label ?? "—"} sub={statuses[0] ? `${statuses[0].value} records` : "No status field"} />
        <MetricCard label="SBF WORLD sources" value={sources.length} sub="Shared data sources" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <DonutSummary rows={rows} />
        <HorizontalBars title="Pipeline snapshot" subtitle="Stage/status volume" items={statuses} />
        <HorizontalBars title="Category mix" subtitle="Asset class, market, or geography" items={assetClasses} />
      </div>
    </div>
  );
}

function DatabaseTable({ rows }: { rows: PortalDatabaseRow[] }) {
  const columns = databaseColumns(rows);
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row.sourceTitle, row.title, ...Object.values(row.fields)].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [rows.length, query]);

  if (!rows.length) {
    return (
      <p className="px-6 pb-6 text-sm text-muted">
        No Brad-scoped live rows are visible to the SBF WORLD connection yet.
      </p>
    );
  }

  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    if (totalPages <= 7) return true;
    return item === 1 || item === totalPages || Math.abs(item - safePage) <= 1;
  });

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-white/[0.05] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium text-chalk">Live SBF WORLD records</div>
          <p className="mt-0.5 text-xs text-muted">
            Showing {filteredRows.length ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredRows.length)} of {filteredRows.length}. Page size locked to 20 records.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this table..."
          className="w-full rounded-lg border border-white/[0.08] bg-ink-900 px-3 py-2 text-xs text-chalk outline-none transition focus:border-gold/50 md:w-64"
        />
      </div>

      <div className="sbf-scroll max-h-[560px] overflow-auto">
        <table className="min-w-max w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-y border-white/[0.06] bg-ink-950/95 text-muted backdrop-blur">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Source</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Record</th>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">
                  {cleanLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {visibleRows.map((row) => (
              <tr key={`${row.sourceTitle ?? "source"}-${row.id}`} className="align-top hover:bg-gold/[0.035]">
                <td className="max-w-[220px] px-4 py-3 text-gold/80">
                  <span className="line-clamp-3 whitespace-pre-wrap break-words">
                    {sbfSourceLabel(row.sourceTitle)}
                  </span>
                </td>
                <td className="max-w-[260px] px-4 py-3 font-medium text-chalk">
                  <span className="line-clamp-4 whitespace-pre-wrap break-words">{rowPrimaryLabel(row)}</span>
                </td>
                {columns.map((column) => (
                  <td key={column} className="max-w-[340px] px-4 py-3 text-chalk/80">
                    <span className="line-clamp-5 whitespace-pre-wrap break-words">
                      {row.fields[column] || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted">
          {rows.length > 20
            ? `Pagination active: ${rows.length} total records are split into ${totalPages} pages.`
            : "All visible records fit on one page."}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-chalk/80 transition hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {pageButtons.map((item, index) => {
            const previous = pageButtons[index - 1];
            const needsGap = previous && item - previous > 1;
            return (
              <span key={item} className="flex items-center gap-2">
                {needsGap && <span className="text-xs text-muted">…</span>}
                <button
                  type="button"
                  onClick={() => setPage(item)}
                  className={`h-8 min-w-8 rounded-lg border px-2 text-xs transition ${
                    item === safePage
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-white/[0.08] text-chalk/70 hover:border-gold/40"
                  }`}
                >
                  {item}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-chalk/80 transition hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


function NotionSimpleTable({ rows }: { rows: string[][] }) {
  if (!rows.length) return null;
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  return (
    <div className="sbf-scroll overflow-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-white/[0.06] bg-ink-950/80 text-muted">
          <tr>
            {header.map((cell, index) => (
              <th key={`${cell}-${index}`} className="whitespace-nowrap px-4 py-3 font-medium">
                {cell || `Column ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gold/[0.035]">
              {header.map((_, cellIndex) => (
                <td key={cellIndex} className="max-w-[360px] px-4 py-3 text-chalk/80">
                  <span className="whitespace-pre-wrap break-words">{row[cellIndex] || "—"}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotionBlock({ block }: { block: DynamicPortalBlock }) {
  const indent = block.depth > 0 ? "ml-3 border-l border-white/[0.06] pl-4" : "";

  if (block.type === "table") {
    const rows = rowsForSimpleTableBlock(block);
    return (
      <div className={`mt-5 ${indent}`}>
        <NotionSimpleTable rows={rows} />
      </div>
    );
  }

  if (block.type === "table_row") {
    return null;
  }

  if (block.type === "heading_1") {
    return <h2 className={`mt-8 text-xl font-semibold tracking-tight text-chalk ${indent}`}>{block.text}</h2>;
  }

  if (block.type === "heading_2") {
    return <h3 className={`mt-7 text-base font-semibold tracking-tight text-gold ${indent}`}>{block.text}</h3>;
  }

  if (block.type === "heading_3") {
    return <h4 className={`mt-5 text-sm font-medium uppercase tracking-[0.18em] text-muted ${indent}`}>{block.text}</h4>;
  }

  if (block.type === "divider") {
    return <div className="my-6 border-t border-white/[0.06]" />;
  }

  if (block.type === "bulleted_list_item") {
    return <li className={`ml-5 list-disc text-sm leading-6 text-chalk/80 ${indent}`}>{block.text}</li>;
  }

  if (block.type === "numbered_list_item") {
    return <li className={`ml-5 list-decimal text-sm leading-6 text-chalk/80 ${indent}`}>{block.text}</li>;
  }

  if (block.type === "to_do") {
    return (
      <div className={`flex items-start gap-3 text-sm text-chalk/80 ${indent}`}>
        <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${block.checked ? "border-gold bg-gold text-ink-950" : "border-white/20"}`}>
          {block.checked ? "✓" : ""}
        </span>
        <span>{block.text}</span>
      </div>
    );
  }

  if (block.type === "quote" || block.type === "callout") {
    return (
      <div className={`rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm leading-6 text-chalk/80 ${indent}`}>
        {block.text}
      </div>
    );
  }

  if (block.imageUrl) {
    return (
      <figure className={`overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 ${indent}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.imageUrl} alt={block.caption || block.text || "SBF WORLD image"} className="max-h-[520px] w-full object-cover" />
        {block.caption && <figcaption className="px-4 py-3 text-xs text-muted">{block.caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === "child_database" || block.databaseRows) {
    return (
      <Card className={`mt-5 overflow-hidden ${indent}`}>
        <CardHeader
          title={block.text || block.fields?.title || "SBF WORLD Database"}
          sub={`${block.databaseRows?.length ?? 0} Brad-scoped live SBF WORLD records`}
        />
        <DatabaseTable rows={block.databaseRows ?? []} />
      </Card>
    );
  }

  if (block.type === "child_page") {
    return (
      <Card className={`mt-5 ${indent}`}>
        <CardHeader title={block.text || "SBF WORLD Page"} sub="Nested live SBF WORLD page" />
        <div className="space-y-3 p-6">
          {block.children?.length ? (
            block.children.map((child) => <NotionBlock key={child.id} block={child} />)
          ) : (
            <p className="text-sm text-muted">No visible child content.</p>
          )}
        </div>
      </Card>
    );
  }

  if (block.children?.length) {
    return (
      <div className={`space-y-3 ${indent}`}>
        {block.text && <p className="text-sm leading-6 text-chalk/80">{block.text}</p>}
        {block.children.map((child) => <NotionBlock key={child.id} block={child} />)}
      </div>
    );
  }

  if (!block.text) return null;

  return <p className={`text-sm leading-6 text-chalk/75 ${indent}`}>{block.text}</p>;
}

function PortalDataSectionCard({ section }: { section: DynamicPortalDataSection }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={section.title}
        sub={
          section.sourceTitles.length
            ? `${section.rows.length} approved rows from ${section.sourceTitles.join(", ")}`
            : section.description
        }
      />
      {section.sourceTitles.length ? (
        <>
          <SectionInsightPanel rows={section.rows} />
          <DatabaseTable rows={section.rows} />
        </>
      ) : (
        <div className="space-y-2 p-6">
          <p className="text-sm text-muted">{section.description}</p>
          <p className="text-xs text-muted/70">
            No Brad-scoped rows were returned yet. Share the matching SBF WORLD database with SBF WORLD Platform and make sure the rows contain Brad, Brad Gaubert, Brad’s email, or his Contact ID.
          </p>
        </div>
      )}
    </Card>
  );
}

const quickActionToType: Record<string, string> = {
  "Submit new asset": "new-asset",
  "Add or update buy box": "buy-box",
  "Attach document links": "documents",
  "Request underwriting support": "underwriting",
  "Flag item for CORE review": "core-review",
  "Confirm JV logic for a submission": "jv-logic",
  "Request full reveal": "full-reveal",
  "Request intro / next step": "intro-next-step",
};

const defaultFormState = {
  investorBuyerName: "",
  contactDetails: "",
  mandateCriteria: "",
  budget: "",
  geography: "",
  assetClass: "",
  ndaStatus: "",
  proofOfFundsStatus: "",
  assetOrMatchName: "",
  documentLinks: "",
  notes: "",
};

type PartnerFormState = typeof defaultFormState;

function PartnerSubmissionForms({ email, quickActions, onSubmitted }: { email: string; quickActions: string[]; onSubmitted?: () => Promise<void> | void }) {
  const [submissionType, setSubmissionType] = useState("buy-box");
  const [fields, setFields] = useState<PartnerFormState>(defaultFormState);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [extracting, setExtracting] = useState(false);

  const setField = (key: keyof PartnerFormState, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const selectDocuments = async (files: File[]) => {
    setDocuments(files);
    if (!files.length || submissionType !== "new-asset") return;
    setExtracting(true);
    setError("");
    setStatus("Reading the asset document and filling the form…");
    try {
      const form = new FormData();
      form.append("document", files[0]);
      const response = await fetch("/api/notion/portal/extract-asset", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to read document.");
      setFields((current) => ({ ...current, ...Object.fromEntries(Object.entries(payload.data).filter(([, value]) => Boolean(value))) } as PartnerFormState));
      setStatus("Asset document read successfully. Review the populated fields, then submit to Assets — CORE.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Unable to read document.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);

    try {
      const submissionFields = {
        "Investor / buyer name": fields.investorBuyerName,
        "Contact details": fields.contactDetails,
        "Mandate criteria": fields.mandateCriteria,
        Budget: fields.budget,
        Geography: fields.geography,
        "Asset class": fields.assetClass,
        "NDA status": fields.ndaStatus,
        "Proof-of-funds status": fields.proofOfFundsStatus,
        "Asset / match / item name": fields.assetOrMatchName,
        "Document links": fields.documentLinks,
        "Notes / special requirements": fields.notes,
      };

      const formData = new FormData();
      formData.append("email", email);
      formData.append("submissionType", submissionType);
      formData.append("fields", JSON.stringify(submissionFields));
      documents.forEach((file) => formData.append("documents", file));

      const response = await fetch("/api/notion/portal/submit", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to submit request.");
      const uploadedCount = Array.isArray(payload.data?.uploadedFiles) ? payload.data.uploadedFiles.length : 0;
      setStatus(`Submitted into ${payload.data?.route ?? "Partner Submissions — CORE"}: ${payload.data?.title ?? "Partner request"}. Status: ${payload.data?.status ?? "New"}${uploadedCount ? ` · ${uploadedCount} document${uploadedCount === 1 ? "" : "s"} attached in SBF WORLD` : ""}. The portal is refreshing live counts now.`);
      setFields(defaultFormState);
      setDocuments([]);
      setFileInputKey((value) => value + 1);
      await onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Universal Partner Intake"
        sub="Submit new assets, buy boxes, documents, support requests, matching requests, underwriting requests, and updates. The system attributes everything to the logged-in partner."
      />

      <div className="grid gap-3 border-b border-white/[0.05] p-6 md:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setSubmissionType(quickActionToType[action] ?? "support")}
            className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
              submissionType === (quickActionToType[action] ?? "support")
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-white/[0.08] bg-white/[0.02] text-chalk/70 hover:border-gold/30"
            }`}
          >
            {action}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Investor / buyer name" value={fields.investorBuyerName} onChange={(value) => setField("investorBuyerName", value)} />
          <Field label="Contact details" value={fields.contactDetails} onChange={(value) => setField("contactDetails", value)} />
          <Field label="Budget" value={fields.budget} onChange={(value) => setField("budget", value)} />
          <Field label="Geography" value={fields.geography} onChange={(value) => setField("geography", value)} />
          <Field label="Asset class" value={fields.assetClass} onChange={(value) => setField("assetClass", value)} />
          <Field label="Asset / match / item name" value={fields.assetOrMatchName} onChange={(value) => setField("assetOrMatchName", value)} />
          <Field label="NDA status" value={fields.ndaStatus} onChange={(value) => setField("ndaStatus", value)} />
          <Field label="Proof-of-funds status" value={fields.proofOfFundsStatus} onChange={(value) => setField("proofOfFundsStatus", value)} />
        </div>

        <Textarea label="Mandate criteria" value={fields.mandateCriteria} onChange={(value) => setField("mandateCriteria", value)} />
        <Textarea label="Document links" value={fields.documentLinks} onChange={(value) => setField("documentLinks", value)} placeholder="Paste links to PDFs, folders, teasers, underwriting files, NDA docs, etc." />

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="label-mono text-gold">Upload documents</div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Attach asset docs, teasers, NDAs, POF files, underwriting PDFs, ownership evidence, or diligence files. Uploaded files are attached to the Notion submission page/row and remain scoped to the logged-in partner.
              </p>
            </div>
            <span className="rounded-full border border-gold/20 bg-gold/[0.08] px-3 py-1 text-xs text-gold">20MB max per file</span>
          </div>
          <input
            key={fileInputKey}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={(event) => void selectDocuments(Array.from(event.currentTarget.files ?? []))}
            className="mt-4 w-full rounded-xl border border-dashed border-gold/25 bg-black/20 px-4 py-4 text-sm text-chalk file:mr-4 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:border-gold/45"
          />
          {documents.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {documents.map((file) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="truncate text-sm font-medium text-chalk">{file.name}</div>
                  <div className="mt-1 text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "document"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea label="Notes / special requirements" value={fields.notes} onChange={(value) => setField("notes", value)} />

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {status && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{status}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? "Uploading documents and routing into Partner Submissions — CORE..." : "Submit asset / request with documents"}
        </Button>
      </form>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="label-mono text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk placeholder:text-muted/60 outline-none transition-all focus:border-gold/50 focus:shadow-glow-sm"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono text-muted">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk placeholder:text-muted/60 outline-none transition-all focus:border-gold/50 focus:shadow-glow-sm"
      />
    </label>
  );
}

function LiveSubmissionSyncPanel({ portal, onRefresh }: { portal: DynamicPortalPage | null; onRefresh: () => Promise<void> }) {
  const submissionRows = rowsForPortalView(portal, "submissions");
  const assetRows = rowsForPortalView(portal, "assets");
  const matchingRows = rowsForPortalView(portal, "matches");
  const underwritingRows = rowsForPortalView(portal, "underwriting");
  const totalVisibleValue = [...submissionRows, ...assetRows, ...matchingRows, ...underwritingRows].reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const latest = submissionRows.slice(0, 3);

  return (
    <Card className="overflow-hidden border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_28rem),rgba(8,8,8,0.72)]">
      <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
        <div className="p-6">
          <div className="label-mono text-gold">Live submission sync</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-chalk">Brad portal updates after every submitted asset, buy box, document, support request, or match request.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            New entries are written into Partner Submissions — CORE, then this portal re-reads SBF WORLD so counts, cards, status boards, and admin visibility stay current. The result is a CRM pipeline, not a pile of Notion pages wearing a tie.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="My submissions" value={submissionRows.length} sub="Partner Submissions — CORE" />
            <MetricCard label="My assets/signals" value={assetRows.length} sub="Brad-scoped only" />
            <MetricCard label="My matches" value={matchingRows.length} sub="Teaser-safe records" />
            <MetricCard label="Visible value" value={compactMoney(totalVisibleValue)} sub="From partner-visible fields" />
          </div>
        </div>
        <div className="border-t border-white/[0.06] p-6 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="label-mono text-muted">Latest submitted activity</div>
              <div className="mt-1 text-sm text-chalk">Live status board</div>
            </div>
            <Button size="sm" variant="outline" onClick={onRefresh}>Refresh</Button>
          </div>
          <div className="mt-4 space-y-2">
            {latest.length ? latest.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                <div className="line-clamp-1 text-xs font-medium text-chalk">{rowPrimaryLabel(row)}</div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted">
                  <span>{assetStatusForRow(row)}</span>
                  <span>{fieldValue(row.fields, ["route", "workflow route", "core route"]) || "CORE routing"}</span>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs leading-5 text-muted">
                No partner submissions visible yet. Once Brad submits, this count should increase after refresh.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}


const uniquePortalRows = (rows: PortalDatabaseRow[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.id.replace(/-/g, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergedPortalRows = (...groups: PortalDatabaseRow[][]) => uniquePortalRows(groups.flat());

function CommandMiniMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="label-mono text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-chalk">{value}</div>
      {helper && <div className="mt-1 text-xs leading-5 text-muted">{helper}</div>}
    </div>
  );
}

function SimpleCommandCard({
  title,
  subtitle,
  rows,
  href,
  valueLabel = "Visible value",
  showValue = true,
}: {
  title: string;
  subtitle: string;
  rows: PortalDatabaseRow[];
  href: string;
  valueLabel?: string;
  showValue?: boolean;
}) {
  const totalValue = rows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const topStatus = groupRowsByField(rows, ["asset status", "status", "stage", "current stage"])[0];
  const topCategory = groupRowsByField(rows, ["asset class", "asset type", "pillar", "market", "geography"])[0];

  return (
    <Link href={href} className="group block h-full">
      <div className="relative h-full overflow-hidden rounded-[28px] border border-gold/18 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.13),transparent_20rem),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.42)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-[0_26px_90px_rgba(212,175,55,0.12)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="relative z-10 flex min-h-[250px] flex-col justify-between gap-5">
          <div>
            <div className="label-mono text-gold">{title}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          </div>

          <div className={`grid gap-3 ${showValue ? "sm:grid-cols-2" : ""}`}>
            <CommandMiniMetric label="Records" value={rows.length} helper="Brad-scoped only" />
            {showValue && <CommandMiniMetric label={valueLabel} value={compactMoney(totalValue)} helper="Partner-visible fields" />}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">Top status</div>
              <div className="mt-1.5 truncate text-chalk/85">{topStatus ? `${topStatus.label} · ${topStatus.value}` : "No status yet"}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">Top category</div>
              <div className="mt-1.5 truncate text-chalk/85">{topCategory ? `${topCategory.label} · ${topCategory.value}` : "No category yet"}</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
            <span className="text-xs text-muted">Open clean detail page</span>
            <span className="rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-1.5 text-xs text-gold transition group-hover:bg-gold group-hover:text-black">
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SimpleSummaryRow({ label, rows, showValue = true }: { label: string; rows: PortalDatabaseRow[]; showValue?: boolean }) {
  const value = rows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  return (
    <div className={`grid items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-sm ${showValue ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
      <div className="font-medium text-chalk">{label}</div>
      <div className="font-mono text-gold">{rows.length}</div>
      {showValue && <div className="min-w-[90px] text-right font-semibold text-chalk">{compactMoney(value)}</div>}
    </div>
  );
}

function SimpleCommandCenter({
  portal,
  user,
  onRefresh,
}: {
  portal: DynamicPortalPage | null;
  user: any;
  onRefresh: () => Promise<void>;
}) {
  const assetRows = rowsForPortalView(portal, "assets");
  const completeAssetRows = uniquePortalRows(
    (portal?.sections ?? []).filter((section) => section.key === "complete-assets").flatMap((section) => section.rows),
  );
  const buyBoxRows = rowsForPortalView(portal, "buy-box");
  const investorRows = rowsForPortalView(portal, "investors");
  const underwritingRows = rowsForPortalView(portal, "underwriting");
  const matchRows = rowsForPortalView(portal, "matches");
  const submissionRows = rowsForPortalView(portal, "submissions");
  const allRows = mergedPortalRows(assetRows, buyBoxRows, investorRows, underwritingRows, matchRows, submissionRows);
  const totalVisibleValue = allRows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const latest = submissionRows.slice(0, 4);
  const pillarAudit = ["Real Estate", "Business", "Capital", "SBF Vault"].map((pillar) => ({
    pillar,
    count: allRows.filter((row) => pillarForRow(row).toLowerCase().includes(pillar.toLowerCase())).length,
  }));
  const countAudit = [
    ["Assets", assetRows.length, "/sbf-vault", "Owner scoped"],
    ["Buy Boxes / Mandates", buyBoxRows.length, "/buy-box", "Owner scoped"],
    ["Underwriting", underwritingRows.length, "/underwriting", "Owner scoped"],
    ["Investors / Buyers / Lenders", investorRows.length, "/investors", "Owner scoped"],
    ["Matches", matchRows.length, "/deals", "Owner scoped"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-gold/20 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_26rem),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] md:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="label-mono text-gold">Simple Command Center</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-chalk md:text-4xl">{user?.name ?? "Partner"} Portal Snapshot</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Clean numbers only: assets, buy boxes, investors, underwriting, matches, submissions, and visible value. The detailed CRM tables stay inside each section so the dashboard does not look like a spreadsheet had a nervous breakdown.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 rounded-3xl border border-white/[0.07] bg-black/25 p-4 sm:min-w-[280px] lg:w-auto">
            <CommandMiniMetric label="All records" value={allRows.length} />
            <CommandMiniMetric label="Total value" value={compactMoney(totalVisibleValue)} />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-gold/15">
        <CardHeader title={`${user?.name ?? "My"} totals`} sub="Live New Build Zone — 8/5/2026 records filtered by the signed-in owner's Notion identity." />
        <div className="grid gap-px bg-white/[.06] sm:grid-cols-2 xl:grid-cols-5">
          {countAudit.map(([label, live, href, detail]) => <Link key={label} href={href} className="bg-ink-900 p-4 transition hover:bg-gold/[.06]"><div className="label-mono text-muted">{label}</div><div className="mt-2 text-2xl font-semibold text-chalk">{live}</div><div className="mt-1 text-xs text-emerald-300">{detail}</div></Link>)}
        </div>
      </Card>

      <Card className="overflow-hidden border-gold/15">
        <CardHeader title="All SBF WORLD pillars" sub="Every pillar remains available; counts include only records assigned to this signed-in user." />
        <div className="grid gap-px bg-white/[.06] sm:grid-cols-2 xl:grid-cols-4">
          {pillarAudit.map(({ pillar, count }) => <div key={pillar} className="bg-ink-900 p-4"><div className="label-mono text-gold">{pillar}</div><div className="mt-2 text-2xl font-semibold text-chalk">{count}</div><div className="mt-1 text-xs text-muted">New Build Zone records</div></div>)}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <SimpleCommandCard
          title="My Assets"
          subtitle="Assets and signals assigned to the signed-in owner across every SBF WORLD pillar."
          rows={assetRows}
          href="/sbf-vault"
        />
        <SimpleCommandCard
          title="Complete Assets"
          subtitle="Founder-approved, portal-visible assets with reveal stage, market, value, and asset type complete. Only these assets enter matching."
          rows={completeAssetRows}
          href="/matching-engine"
        />
        <SimpleCommandCard
          title="My Buy Boxes"
          subtitle="Buyer mandates and criteria from 06 — Buy Boxes & Mandates — CORE / Brad — CORE Buy Boxes."
          rows={buyBoxRows}
          href="/buy-box"
        />
        <SimpleCommandCard
          title="My Investors"
          subtitle="Investors, buyers, and lenders connected to the signed-in owner."
          rows={investorRows}
          href="/investors"
          showValue={false}
        />
        <SimpleCommandCard
          title="My Underwriting"
          subtitle="Underwriting review and approved output records from 07 — Underwriting Engine — CORE."
          rows={underwritingRows}
          href="/underwriting"
        />
        <SimpleCommandCard
          title="My Matches"
          subtitle="Teaser-safe matching records only. Full reveal still requires admin approval."
          rows={matchRows}
          href="/matching-engine"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader title="Simple totals" sub="Same idea as your sketch: record count on the left, visible value on the right." />
          <div className="space-y-3 p-5">
            <SimpleSummaryRow label="My Assets" rows={assetRows} />
            <SimpleSummaryRow label="My Buy Boxes" rows={buyBoxRows} />
            <SimpleSummaryRow label="My Investors" rows={investorRows} showValue={false} />
            <SimpleSummaryRow label="My Underwriting" rows={underwritingRows} />
            <SimpleSummaryRow label="My Matches" rows={matchRows} />
            <SimpleSummaryRow label="My Submissions" rows={submissionRows} />
            <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/[0.06] px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-chalk">Total visible portal</span>
                <span className="font-mono text-gold">{allRows.length}</span>
                <span className="min-w-[100px] text-right text-xl font-semibold text-chalk">{compactMoney(totalVisibleValue)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Latest activity" sub="Submissions written into Partner Submissions — CORE." />
          <div className="space-y-3 p-5">
            {latest.length ? (
              latest.map((row) => (
                <Link key={row.id} href="/submissions" className="block rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-gold/35 hover:bg-gold/[0.04]">
                  <div className="line-clamp-1 text-sm font-medium text-chalk">{rowPrimaryLabel(row)}</div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
                    <span>{assetStatusForRow(row)}</span>
                    <span>{fieldValue(row.fields, ["route", "workflow route", "core route"]) || "SBF WORLD routing"}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs leading-5 text-muted">
                No submitted activity yet. Once Brad submits an asset, buy box, document, or match request, it appears here and admin can approve it.
              </div>
            )}
            <Button size="sm" variant="outline" onClick={onRefresh}>Refresh live data</Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/intake" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-chalk transition hover:border-gold/35 hover:bg-gold/[0.04]">Submit anything →</Link>
        <Link href="/matching-engine" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-chalk transition hover:border-gold/35 hover:bg-gold/[0.04]">Run matching engine →</Link>
        <Link href="/submissions" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-chalk transition hover:border-gold/35 hover:bg-gold/[0.04]">Check submission status →</Link>
        <Link href="/settings" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-chalk transition hover:border-gold/35 hover:bg-gold/[0.04]">Partner identity →</Link>
      </div>
    </div>
  );
}


export type PortalView =
  | "overview"
  | "identity"
  | "matches"
  | "assets"
  | "investors"
  | "underwriting"
  | "buy-box"
  | "matching-engine"
  | "documents"
  | "submissions"
  | "intake"
  | "support"
  | "rules"
  | "command";

const portalNavItems: Array<{
  href: string;
  view: PortalView;
  eyebrow: string;
  title: string;
  desc: string;
}> = [
  {
    href: "/dashboard",
    view: "overview",
    eyebrow: "Command Dashboard",
    title: "Brad Portal Home",
    desc: "Live SBF WORLD partner command center pulled from CORE.",
  },
  {
    href: "/settings",
    view: "identity",
    eyebrow: "Partner Identity",
    title: "Identity & Access",
    desc: "Brad’s active profile, role, status, and verification attributes.",
  },
  {
    href: "/deals",
    view: "matches",
    eyebrow: "Active Matches",
    title: "Matches & Deal Flow",
    desc: "Brad-scoped matches only, following Teaser → NDA → Full Reveal → LOI / PSA.",
  },
  {
    href: "/sbf-vault",
    view: "assets",
    eyebrow: "SBF Vault",
    title: "Assets & Buy Box Signals",
    desc: "Brad assets, partner-safe opportunities, and visible buy box signals.",
  },
  {
    href: "/investors",
    view: "investors",
    eyebrow: "Investors",
    title: "Investors / Buyers / Lenders",
    desc: "Brad-scoped capital relationships from 04 — Investors, Buyers & Lenders — CORE.",
  },
  {
    href: "/underwriting",
    view: "underwriting",
    eyebrow: "Underwriting Desk",
    title: "Approved Underwriting Outputs",
    desc: "Only partner-cleared underwriting and diligence material, with internal logic hidden.",
  },
  {
    href: "/buy-box",
    view: "buy-box",
    eyebrow: "Buy Box / Mandate",
    title: "Submit & Track Mandates",
    desc: "Add buyer mandates, buy boxes, POF/NDA status, and criteria into the CORE flow.",
  },
  {
    href: "/matching-engine",
    view: "matching-engine",
    eyebrow: "Matching Engine",
    title: "Smart Teaser Matches",
    desc: "Filter Brad-visible assets and matches, then review teaser-only cards before requesting reveal.",
  },
  {
    href: "/documents",
    view: "documents",
    eyebrow: "Documents",
    title: "Documents & Diligence",
    desc: "Partner-visible documents, teasers, reveal status, and upload routing.",
  },
  {
    href: "/submissions",
    view: "submissions",
    eyebrow: "My Submissions",
    title: "Submission Status Center",
    desc: "Track Brad-attributed assets, buy boxes, documents, support, matching, and underwriting requests from Partner Submissions — CORE.",
  },
  {
    href: "/intake",
    view: "intake",
    eyebrow: "Universal Intake",
    title: "Submit Anything to CORE",
    desc: "Assets, updates, buy boxes, matching, underwriting, document, and support requests.",
  },
  {
    href: "/support",
    view: "support",
    eyebrow: "Support Routing",
    title: "Support & Next-Step Requests",
    desc: "Questions, access requests, ownership clarification, and routing support.",
  },
  {
    href: "/rules",
    view: "rules",
    eyebrow: "Governance",
    title: "Review Rhythm & Dashboard Rules",
    desc: "Visibility rules and review cadence enforced across the partner portal.",
  },
];

const viewCopy: Record<PortalView, { eyebrow: string; title: string; desc: string }> = {
  overview: {
    eyebrow: "Live SBF WORLD Partner Portal",
    title: "Command Dashboard",
    desc:
      "Verified from 02 — People, Members & Relationships — CORE. Every panel below is pulled from Brad’s assigned SBF WORLD portal and partner-safe data sources.",
  },
  identity: {
    eyebrow: "Partner Identity",
    title: "Identity & Access",
    desc: "Live profile fields from 02 — People, Members & Relationships — CORE.",
  },
  matches: {
    eyebrow: "Active Matches",
    title: "Matches & Deal Flow",
    desc: "Brad-scoped active matches only. Internal CORE matching logic and other partners’ records stay hidden.",
  },
  assets: {
    eyebrow: "SBF Vault",
    title: "Assets & Buy Box Signals",
    desc: "Live Brad assets, visible opportunities, and buy box signals from the assigned SBF WORLD portal.",
  },
  investors: {
    eyebrow: "Investors / Buyers / Lenders",
    title: "My Investors",
    desc: "Brad-scoped investor, buyer, and lender records from 04 — Investors, Buyers & Lenders — CORE.",
  },
  underwriting: {
    eyebrow: "Underwriting Desk",
    title: "Approved Underwriting Outputs",
    desc: "Partner-cleared underwriting outputs only. Internal notes, legal strategy, and protected files stay filtered.",
  },
  "buy-box": {
    eyebrow: "Buy Box / Mandate",
    title: "Submit & Track Mandates",
    desc: "Submit new buyer mandates and buy boxes into the approved SBF WORLD CORE workflow.",
  },
  "matching-engine": {
    eyebrow: "Matching Engine",
    title: "Smart Teaser Matches",
    desc: "Enter mandate criteria, filter Brad-visible SBF WORLD records, and show only teaser-level cards until reveal is approved.",
  },
  documents: {
    eyebrow: "Documents & Diligence",
    title: "Partner-Safe Document Center",
    desc: "Visible documents and diligence status connected to Brad’s assets, buy boxes, matches, and requests.",
  },
  submissions: {
    eyebrow: "My Submissions",
    title: "Submission Status Center",
    desc: "Every partner submission is attributed to the logged-in Contact ID/email and routed into Partner Submissions — CORE for status tracking.",
  },
  intake: {
    eyebrow: "Universal Intake",
    title: "CORE Submission Router",
    desc: "Submit assets, documents, updates, support requests, matching requests, and underwriting requests.",
  },
  support: {
    eyebrow: "Support Requests",
    title: "SBF WORLD Team Routing",
    desc: "Ask questions, request access, clarify ownership, or ask for next-step routing.",
  },
  rules: {
    eyebrow: "Governance",
    title: "Review Rhythm & Dashboard Rules",
    desc: "The partner portal’s operating cadence and visibility rules.",
  },
  command: {
    eyebrow: "Raw SBF WORLD Portal",
    title: "Command Dashboard",
    desc: "Every visible block pulled from Partner Portal — Brad and shared child pages/databases.",
  },
};

function PortalSwitchboard({ activeView }: { activeView: PortalView }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {portalNavItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <div
            className={`group h-full rounded-2xl border p-4 transition-all duration-200 ${
              activeView === item.view
                ? "border-gold/50 bg-gold/[0.08] shadow-glow-sm"
                : "border-white/[0.07] bg-white/[0.025] hover:border-gold/35 hover:bg-gold/[0.04]"
            }`}
          >
            <div className="label-mono text-gold/80">{item.eyebrow}</div>
            <div className="mt-2 text-sm font-semibold text-chalk">{item.title}</div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{item.desc}</p>
            <div className="mt-4 text-xs text-gold/80 opacity-75 transition group-hover:translate-x-1 group-hover:opacity-100">
              Open section →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function NotionLiveBadge({ source }: { source?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      Live SBF WORLD source
    </div>
  );
}

function EmptySectionNote({ title }: { title: string }) {
  return (
    <Card className="p-6">
      <div className="text-sm font-medium text-chalk">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted">
        Nothing partner-visible came back from SBF WORLD yet. Share the matching page/database with SBF WORLD Platform and make sure rows contain Brad, Brad Gaubert, his email, or his Contact ID. The API cannot fetch data that is not shared with the SBF WORLD connection.
      </p>
    </Card>
  );
}

function sectionMatches(section: DynamicPortalDataSection, keys: string[]) {
  const haystack = `${section.key} ${section.title} ${section.description} ${section.sourceTitles.join(" ")}`.toLowerCase();
  return keys.some((key) => haystack.includes(key.toLowerCase()));
}

function SectionCollection({
  portal,
  keys,
  emptyTitle,
}: {
  portal: DynamicPortalPage | null;
  keys: string[];
  emptyTitle: string;
}) {
  const matched = (portal?.sections ?? []).filter((section) => sectionMatches(section, keys));
  if (!matched.length) return <EmptySectionNote title={emptyTitle} />;

  return (
    <div className="space-y-5">
      {matched.map((section) => (
        <PortalDataSectionCard key={section.key} section={section} />
      ))}
    </div>
  );
}


const viewRecordKeys: Partial<Record<PortalView, string[]>> = {
  overview: ["assets", "buy-box-signals", "active-matches", "deal-flow", "submissions"],
  matches: ["active-matches", "deal-flow"],
  assets: ["assets"],
  investors: ["investors"],
  underwriting: ["underwritten-assets"],
  "buy-box": ["buy-box-signals"],
  documents: ["documents"],
  submissions: ["submissions"],
  support: ["support", "workflow"],
};

const rowsForPortalView = (portal: DynamicPortalPage | null, view: PortalView) => {
  const keys = viewRecordKeys[view] ?? [];
  if (!keys.length) return [] as PortalDatabaseRow[];
  const sections = (portal?.sections ?? []).filter((section) => keys.includes(section.key));
  return uniquePortalRows(sections.flatMap((section) => section.rows));
};

const safeAllFieldsForModal = (row: PortalDatabaseRow, hideFinancial = false) =>
  Object.entries(row.fields)
    .filter(([key, value]) => value && !/password|token|secret|internal logic|private key/i.test(key))
    .filter(([key]) => !hideFinancial || !/capital|value|price|budget|amount|asking|deal size|fund|aum/i.test(key))
    .slice(0, 90);

function RecordCardDeck({
  portal,
  view,
  title,
  subtitle,
}: {
  portal: DynamicPortalPage | null;
  view: PortalView;
  title: string;
  subtitle: string;
}) {
  const { session } = useSession();
  const rows = useMemo(() => rowsForPortalView(portal, view), [portal, view]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PortalDatabaseRow | null>(null);
  const [workflowStep, setWorkflowStep] = useState<"teaser" | "nda" | "underwriting" | "pof" | "submitted" | "loi" | "complete">("teaser");
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [fullUnderwriting, setFullUnderwriting] = useState<PortalDatabaseRow[]>([]);
  const [pofFiles, setPofFiles] = useState<File[]>([]);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [loiFields, setLoiFields] = useState({ "Offer Amount": "", "Closing Date": "", "Key Terms": "" });
  const workflowFieldClass = "w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-muted/50 focus:border-gold/50";
  const pageSize = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.sourceTitle, row.title, ...Object.values(row.fields)].join(" ").toLowerCase().includes(q));
  }, [query, rows]);

  useEffect(() => setPage(1), [query, rows.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const valueTotal = rows.reduce((sum, row) => sum + rowCapitalValue(row), 0);
  const statusMix = groupRowsByField(rows, ["asset status", "status", "stage"]);
  const topStatus = statusMix[0]?.label ?? "—";
  const hideFinancial = view === "investors";

  const closeRecord = () => {
    setSelected(null);
    setWorkflowStep("teaser");
    setNdaAgreed(false);
    setFullUnderwriting([]);
    setPofFiles([]);
    setWorkflowError("");
  };

  const consentAndReveal = async () => {
    if (!selected || !session?.email || !ndaAgreed) return;
    setWorkflowBusy(true);
    setWorkflowError("");
    try {
      const response = await fetch("/api/notion/deal-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.email,
          user: session,
          matchId: selected.id,
          matchTitle: assetNameForRow(selected),
          consent: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to record NDA consent.");
      setFullUnderwriting(Array.isArray(payload.data?.underwriting) ? payload.data.underwriting : []);
      setWorkflowStep("underwriting");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Unable to reveal full underwriting.");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const submitProofOfFunds = async () => {
    if (!selected || !session?.email || !pofFiles.length) return;
    setWorkflowBusy(true);
    setWorkflowError("");
    try {
      const data = new FormData();
      data.set("email", session.email);
      data.set("submissionType", "proof-of-funds");
      data.set("user", JSON.stringify(session));
      data.set("fields", JSON.stringify({
        "Request Action": "Proof of funds approval",
        "Target Record ID": selected.id,
        "Target Record Title": assetNameForRow(selected),
        "Asset / match / item name": assetNameForRow(selected),
        "Asset Owner": fieldValue(selected.fields, ["asset owner", "owner partner", "source partner", "owner"]),
        "NDA status": "Consented",
        "Proof of Funds Status": "Submitted for owner/admin approval",
        "Status": "Submitted for Review",
        "Next Step": "Owner or admin approval required before Letter of Intent",
      }));
      pofFiles.forEach((file) => data.append("documents", file));
      const response = await fetch("/api/notion/portal/submit", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to upload proof of funds.");
      setWorkflowStep("submitted");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Unable to upload proof of funds.");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const workflowRequest = async (action: "status" | "loi") => {
    if (!selected || !session?.email) return;
    setWorkflowBusy(true); setWorkflowError("");
    try {
      const response = await fetch("/api/notion/deal-workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email, user: session, matchId: selected.id, matchTitle: assetNameForRow(selected), action, loi: loiFields }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to continue this workflow.");
      if (action === "status") {
        if (!payload.data?.approved) throw new Error(`Approval is still pending (${payload.data?.status || "Submitted for Review"}).`);
        setWorkflowStep("loi");
      } else setWorkflowStep("complete");
    } catch (error) { setWorkflowError(error instanceof Error ? error.message : "Unable to continue this workflow."); }
    finally { setWorkflowBusy(false); }
  };

  if (!rows.length) return null;

  return (
    <Card className="overflow-hidden border-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_25rem)]">
      <div className="grid gap-0 border-b border-white/[0.06] xl:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6">
          <div className="label-mono text-gold">Live SBF WORLD record deck</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p>
          <div className={`mt-5 grid gap-3 ${hideFinancial ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <MetricCard label="Visible records" value={rows.length} sub="Scoped to this portal" />
            {!hideFinancial && <MetricCard label="Visible value" value={compactMoney(valueTotal)} sub="From approved visible fields" />}
            <MetricCard label="Top status" value={topStatus} sub="Live SBF WORLD mix" />
          </div>
        </div>
        <div className="border-t border-white/[0.06] p-6 xl:border-l xl:border-t-0">
          <HorizontalBars title="Record status mix" subtitle="Card deck composition" items={statusMix.slice(0, 5)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-muted">
          Showing <span className="text-chalk">{filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)}</span> of <span className="text-chalk">{filtered.length}</span>. Page size: <span className="text-gold">20 records</span>.
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets, status, market, mandate…"
          className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-chalk outline-none placeholder:text-muted/55 transition focus:border-gold/45 lg:w-96"
        />
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) => {
          const title = assetNameForRow(row);
          const status = assetStatusForRow(row);
          const type = assetTypeForRow(row);
          const geo = geographyForRow(row) || fieldValue(row.fields, ["market", "region"]) || "Market pending";
          const amount = rowCapitalValue(row);
          const next = fieldValue(row.fields, ["next step", "next action", "route", "workflow stage"]) || "Review in SBF WORLD";
          return (
            <button
              key={`${row.sourceTitle ?? "source"}-${row.id}`}
              type="button"
              onClick={() => { setSelected(row); setWorkflowStep("teaser"); setWorkflowError(""); }}
              className="sbf-premium-card group rounded-3xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
            >
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="sbf-chip">{status}</span>
                    <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-muted">{sbfSourceLabel(row.sourceTitle)}</span>
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight text-chalk group-hover:text-gold">{title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{teaserForRow(row)}</p>
                </div>
                {!hideFinancial && (
                  <div className="shrink-0 rounded-2xl border border-gold/25 bg-gold/10 px-3 py-2 text-right">
                    <div className="text-lg font-semibold text-gold">{compactMoney(amount)}</div>
                    <div className="label-mono text-muted">Visible</div>
                  </div>
                )}
              </div>
              <div className="relative z-10 mt-5 grid gap-2 text-xs text-chalk/75 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Asset Type</div><div className="mt-1 truncate">{type}</div></div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Geography</div><div className="mt-1 truncate">{geo}</div></div>
                <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="label-mono text-muted">Next Step</div><div className="mt-1 truncate">{next}</div></div>
              </div>
              {view === "investors" && (
                <div
                  role="link"
                  tabIndex={0}
                  onClick={(event) => { event.stopPropagation(); window.location.href = `/investors/${row.id}/buy-boxes`; }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); window.location.href = `/investors/${row.id}/buy-boxes`; } }}
                  className="relative z-20 mt-4 flex items-center justify-between rounded-xl border border-gold/25 bg-gold/[.08] px-4 py-3 text-gold transition hover:bg-gold/[.13]"
                >
                  <span className="flex items-center gap-2">{Icon.trend(18)} Investor buy boxes</span><span>Open →</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Cards are paginated so large SBF WORLD datasets stay readable, not feral.</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <span className="font-mono text-xs text-gold">Page {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={closeRecord}
        title={selected ? assetNameForRow(selected) : "SBF WORLD record"}
        sub={selected ? `${assetStatusForRow(selected)} · ${sbfSourceLabel(selected.sourceTitle)}` : undefined}
        width="max-w-5xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className={`grid gap-3 ${hideFinancial ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
              <MetricCard label="Status" value={assetStatusForRow(selected)} />
              <MetricCard label="Asset Type" value={assetTypeForRow(selected)} />
              <MetricCard label="Geography" value={geographyForRow(selected) || "—"} />
              {!hideFinancial && <MetricCard label="Visible Value" value={compactMoney(rowCapitalValue(selected))} />}
            </div>
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.055] p-5">
              <div className="label-mono text-gold">Partner-safe teaser</div>
              <p className="mt-2 text-sm leading-6 text-chalk/80">{teaserForRow(selected)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {safeAllFieldsForModal(selected, hideFinancial).map(([key, value]) => (
                <Link key={key} href={`/portal-record/${selected.id}?field=${encodeURIComponent(key)}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition hover:border-gold/40 hover:bg-gold/[.04]">
                  <div className="label-mono text-muted">{cleanLabel(key)}</div>
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-chalk/80">{value}</div>
                  <div className="mt-3 text-xs text-gold">Open field →</div>
                </Link>
              ))}
            </div>
            {view === "matches" && workflowStep === "teaser" && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-white/[0.07] pt-5">
                <Button variant="ghost" onClick={closeRecord}>Close teaser</Button>
                <Button onClick={() => setWorkflowStep("nda")}>View full underwriting</Button>
              </div>
            )}
            {view === "matches" && workflowStep === "nda" && (
              <div className="space-y-4 rounded-2xl border border-gold/20 bg-gold/[0.045] p-5">
                <div><div className="label-mono text-gold">SBF WORLD NDA · SBF-NDA-2026.1</div><h3 className="mt-2 text-xl font-semibold text-chalk">Consent required for full underwriting</h3></div>
                <p className="text-sm leading-6 text-chalk/70">The receiving party agrees to keep all seller information, financial statements, models, underwriting, diligence, pricing, documents, and communications confidential and to use them only to evaluate this opportunity. Access may not be copied, forwarded, or distributed without written approval.</p>
                <div className="grid gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm sm:grid-cols-2"><div><span className="text-muted">Consenting party</span><div className="mt-1 text-chalk">{session?.name || "Portal user"}</div></div><div><span className="text-muted">Email</span><div className="mt-1 text-chalk">{session?.email}</div></div></div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4 text-sm text-chalk/80"><input type="checkbox" checked={ndaAgreed} onChange={(event) => setNdaAgreed(event.target.checked)} className="mt-1 accent-[#C8A24A]" /><span>I have read and agree to the NDA and consent to an audit record being sent to SBF WORLD administration.</span></label>
                {workflowError && <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{workflowError}</div>}
                <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setWorkflowStep("teaser")}>Back</Button><Button disabled={!ndaAgreed || workflowBusy} onClick={() => void consentAndReveal()}>{workflowBusy ? "Recording consent…" : "Consent and proceed"}</Button></div>
              </div>
            )}
            {view === "matches" && workflowStep === "underwriting" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><div className="label-mono text-emerald-300">NDA consent recorded</div><p className="mt-2 text-sm text-emerald-100">Full underwriting is visible only in this consented workflow.</p></div>
                {fullUnderwriting.length ? fullUnderwriting.map((record) => <div key={record.id} className="rounded-2xl border border-gold/15 p-5"><h3 className="text-lg font-semibold text-chalk">{record.title}</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(record.fields).filter(([, value]) => Boolean(value)).map(([key, value]) => <div key={key} className="rounded-xl border border-white/[0.06] bg-black/20 p-4"><div className="label-mono text-muted">{cleanLabel(key)}</div><div className="mt-2 whitespace-pre-wrap break-words text-sm text-chalk/80">{value}</div></div>)}</div></div>) : <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">NDA consent was recorded, but no Underwriting CORE record is related to this match yet.</div>}
                <div className="flex justify-end gap-3"><Button variant="ghost" onClick={closeRecord}>Close</Button><Button onClick={() => setWorkflowStep("pof")}>Show interest</Button></div>
              </div>
            )}
            {view === "matches" && workflowStep === "pof" && (
              <div className="space-y-4 rounded-2xl border border-gold/20 bg-gold/[0.045] p-5"><div><div className="label-mono text-gold">Proof of funds</div><h3 className="mt-2 text-xl font-semibold text-chalk">Upload qualification documents</h3><p className="mt-2 text-sm text-muted">Files are attached in Notion and routed to the asset owner and SBF WORLD admin. Letter of Intent remains locked until either party approves.</p></div><input type="file" multiple onChange={(event) => setPofFiles(Array.from(event.target.files ?? []))} className="w-full rounded-xl border border-dashed border-gold/30 bg-black/20 p-5 text-sm text-chalk file:mr-4 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:text-ink-950" />{pofFiles.length > 0 && <div className="text-xs text-muted">{pofFiles.length} file{pofFiles.length === 1 ? "" : "s"} selected</div>}{workflowError && <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{workflowError}</div>}<div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setWorkflowStep("underwriting")}>Back</Button><Button disabled={!pofFiles.length || workflowBusy} onClick={() => void submitProofOfFunds()}>{workflowBusy ? "Uploading…" : "Submit proof of funds"}</Button></div></div>
            )}
            {view === "matches" && workflowStep === "submitted" && <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5"><div className="label-mono text-emerald-300">Submitted for approval</div><p className="text-sm leading-6 text-emerald-100">Your proof of funds was sent to the asset owner and SBF WORLD admin. The Letter of Intent step remains locked until an approval is recorded in Notion.</p>{workflowError && <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">{workflowError}</div>}<div className="flex justify-end gap-3"><Button variant="ghost" onClick={closeRecord}>Close</Button><Button disabled={workflowBusy} onClick={() => void workflowRequest("status")}>{workflowBusy ? "Checking…" : "Check approval & continue"}</Button></div></div>}
            {view === "matches" && workflowStep === "loi" && <div className="space-y-4 rounded-2xl border border-gold/20 bg-gold/[0.045] p-5"><div><div className="label-mono text-gold">Letter of Intent</div><h3 className="mt-2 text-xl font-semibold text-chalk">Submit LOI terms</h3><p className="mt-2 text-sm text-muted">Proof of funds is approved. These terms will be routed into the SBF WORLD closing workflow.</p></div><div className="grid gap-3 md:grid-cols-2"><input value={loiFields["Offer Amount"]} onChange={(e) => setLoiFields((v) => ({ ...v, "Offer Amount": e.target.value }))} placeholder="Offer amount" className={workflowFieldClass} /><input type="date" value={loiFields["Closing Date"]} onChange={(e) => setLoiFields((v) => ({ ...v, "Closing Date": e.target.value }))} className={workflowFieldClass} /><textarea value={loiFields["Key Terms"]} onChange={(e) => setLoiFields((v) => ({ ...v, "Key Terms": e.target.value }))} placeholder="Key terms and contingencies" className={`${workflowFieldClass} min-h-28 md:col-span-2`} /></div>{workflowError && <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{workflowError}</div>}<div className="flex justify-end gap-3"><Button variant="ghost" onClick={closeRecord}>Close</Button><Button disabled={workflowBusy || !loiFields["Offer Amount"]} onClick={() => void workflowRequest("loi")}>{workflowBusy ? "Submitting…" : "Submit Letter of Intent"}</Button></div></div>}
            {view === "matches" && workflowStep === "complete" && <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5"><div className="label-mono text-emerald-300">LOI submitted</div><p className="text-sm text-emerald-100">The Letter of Intent was routed to SBF WORLD for review and closing coordination.</p><div className="flex justify-end"><Button onClick={closeRecord}>Close</Button></div></div>}
          </div>
        )}
      </Modal>
    </Card>
  );
}

function IdentityPanel({ portal, user, fields }: { portal: DynamicPortalPage | null; user: any; fields: Record<string, string> }) {
  const identityItems = [
    ["Partner Name", user?.name],
    ["Email", user?.email],
    ["Portal Role", user?.role],
    ["Relationship Type", user?.relationshipType],
    ["Access Level", user?.accessLevel || fieldValue(fields, ["access level"])],
    ["Status", portal?.user.status],
    ["Contact ID", user?.contactId || fieldValue(fields, ["contact id"])],
    ["Membership Tier", user?.membershipTier],
    ["Interests", user?.interests],
    ["NDA Status", user?.ndaStatus],
    ["Verification Status", user?.verificationStatus],
  ].filter(([, value]) => value);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Welcome / Activation" sub="Official SBF WORLD ecosystem partner portal" />
        <div className="space-y-3 p-6 text-sm leading-6 text-chalk/80">
          <p>
            Welcome, <span className="text-gold">{user?.name ?? "Partner"}</span>. This portal is your SBF WORLD operating layer for submissions, matches, buy boxes, documents, support requests, and next-step routing.
          </p>
          <p>
            Your portal is scoped to your SBF WORLD identity and assigned partner page. It does not expose unrestricted CORE records, internal matching logic, other partners’ submissions, or protected underwriting files unless those items are approved for partner visibility.
          </p>
          <div className="pt-2"><NotionLiveBadge source="02 — People, Members & Relationships — CORE" /></div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Access Snapshot" sub="Live member verification" />
        <div className="space-y-3 p-6">
          {identityItems.slice(0, 5).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">{label}</div>
              <div className="mt-1.5 text-sm text-chalk/90">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader title="Partner Identity" sub="All visible identity fields from SBF WORLD CORE" />
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {identityItems.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="label-mono text-muted">{label}</div>
              <div className="mt-2 break-words text-sm text-chalk/90">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RulesPanel({ portal }: { portal: DynamicPortalPage | null }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Review Rhythm" sub="Simple cadence for Brad’s portal operations" />
        <div className="space-y-3 p-6">
          {(portal?.reviewRhythm ?? []).map((item) => (
            <div key={item.cadence} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="text-sm font-medium text-gold">{item.cadence}</div>
              <div className="mt-1 text-sm text-muted">{item.focus}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Dashboard Rules" sub="Partner-safe visibility enforced before display" />
        <ul className="space-y-2 p-6 text-sm text-chalk/75">
          {(portal?.dashboardRules ?? []).map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CommandBlocks({ portal }: { portal: DynamicPortalPage | null }) {
  return (
    <Card>
      <CardHeader title="Command Dashboard" sub="Visible blocks pulled from Partner Portal — Brad and its shared child pages/databases." />
      <div className="space-y-5 p-6">
        {portal?.blocks.length ? (
          portal.blocks.map((block) => <NotionBlock key={block.id} block={block} />)
        ) : (
          <div>
            <div className="text-sm text-chalk">No assigned portal page content found yet.</div>
            <p className="mt-2 text-sm text-muted">
              Share “Partner Portal — Brad” and its child databases with SBF WORLD Platform. Also share Active Buy Box Signals, Assets CORE, Matching Engine CORE, and any Brad-scoped child pages/databases.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

type MatchingFilters = {
  buyerName: string;
  assetClass: string;
  geography: string;
  budget: string;
  mandate: string;
  ndaStatus: string;
  proofOfFunds: string;
};

const matchingDefaultFilters: MatchingFilters = {
  buyerName: "",
  assetClass: "",
  geography: "",
  budget: "",
  mandate: "",
  ndaStatus: "",
  proofOfFunds: "",
};

const safeTeaserFields = [
  "teaser",
  "partner teaser",
  "public teaser",
  "summary",
  "description",
  "overview",
  "asset type",
  "asset class",
  "market",
  "geography",
  "location",
  "value",
  "price",
  "budget",
  "status",
  "stage",
  "current stage",
  "next step",
  "nda status",
  "full reveal status",
  "teaser link",
  "documents",
];

const matchingRowsForPortal = (portal: DynamicPortalPage | null) => {
  const assetSections = (portal?.sections ?? []).filter((section) => section.key === "complete-assets");
  return uniquePortalRows(assetSections.flatMap((section) => section.rows)).filter((row) =>
    isCompleteNewBuildAsset(row.fields),
  );
};

const normalizedWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

const rowSearchText = (row: PortalDatabaseRow) =>
  [row.sourceTitle, row.title, ...Object.values(row.fields)].join(" ").toLowerCase();

const teaserForRow = (row: PortalDatabaseRow) => {
  const explicit = fieldValue(row.fields, ["teaser", "partner teaser", "public teaser", "summary", "description", "overview"]);
  if (explicit) return explicit;

  const bits = [
    fieldValue(row.fields, ["asset class", "asset type", "market", "pillar"]),
    fieldValue(row.fields, ["geography", "location", "region"]),
    fieldValue(row.fields, ["value", "price", "budget", "deal size", "asking"]),
    fieldValue(row.fields, ["status", "stage", "current stage"]),
  ].filter(Boolean);

  return bits.length
    ? bits.join(" · ")
    : "Partner-safe teaser available. Request full reveal to access deeper diligence, contacts, and internal review material.";
};

const scoreMatchRow = (row: PortalDatabaseRow, filters: MatchingFilters) => {
  const text = rowSearchText(row);
  const amount = rowCapitalValue(row);
  const budget = parseAmount(filters.budget);
  let score = 30;

  if (filters.assetClass.trim()) {
    const words = normalizedWords(filters.assetClass);
    const hit = words.some((word) => text.includes(word));
    score += hit ? 26 : -8;
  }

  if (filters.geography.trim()) {
    const words = normalizedWords(filters.geography);
    const hit = words.some((word) => text.includes(word));
    score += hit ? 22 : -6;
  }

  if (budget && amount) {
    if (amount <= budget) score += 18;
    else score += Math.max(-12, 18 - Math.round(((amount - budget) / budget) * 25));
  } else if (budget) {
    score += 2;
  }

  if (filters.mandate.trim()) {
    const words = normalizedWords(filters.mandate).slice(0, 14);
    const hits = words.filter((word) => text.includes(word)).length;
    score += Math.min(24, hits * 5);
  }

  if (filters.ndaStatus.trim()) {
    const words = normalizedWords(filters.ndaStatus);
    score += words.some((word) => text.includes(word)) ? 6 : 0;
  }

  if (filters.proofOfFunds.trim()) {
    const words = normalizedWords(filters.proofOfFunds);
    score += words.some((word) => text.includes(word)) ? 6 : 0;
  }

  if ((row.sourceTitle ?? "").toLowerCase().includes("brad")) score += 14;
  if ((row.sourceTitle ?? "").toLowerCase().includes("matching")) score += 8;
  if (fieldValue(row.fields, ["teaser", "partner teaser", "public teaser", "teaser link"])) score += 10;

  return Math.max(1, Math.min(99, Math.round(score)));
};

const partnerVisibleDetails = (row: PortalDatabaseRow, expanded = false) => {
  const canShowFullPartnerRecord = expanded || hasFullRevealAccess(row);
  const details: Array<[string, string]> = [];
  const add = (label: string, value: string) => {
    const clean = value?.trim();
    if (!clean || isGenericValue(clean)) return;
    if (details.some(([existing]) => existing.toLowerCase() === label.toLowerCase())) return;
    details.push([cleanLabel(label), clean]);
  };

  [
    "asset status",
    "status",
    "stage",
    "asset name",
    "opportunity name",
    "deal name",
    "title",
    "name",
    "pillar",
    "asset type",
    "asset class",
    "market",
    "geography",
    "location",
    "value",
    "price",
    "budget",
    "teaser",
    "partner teaser",
    "public teaser",
    "summary",
    "description",
    "overview",
    "next step",
    "nda status",
    "full reveal status",
    "teaser link",
    "documents",
    "proof of funds",
  ].forEach((key) => add(key, fieldValue(row.fields, [key])));

  Object.entries(row.fields).forEach(([key, value]) => {
    if (!canShowFullPartnerRecord && details.length >= 12) return;
    if (!canShowFullPartnerRecord && !safeTeaserFields.some((safe) => key.toLowerCase().includes(safe))) return;
    if (/internal|private|logic|payout|commission|legal strategy|secret|token|password/i.test(key)) return;
    add(key, value);
  });

  return details.slice(0, canShowFullPartnerRecord ? 80 : 12);
};

function MatchTeaserCard({
  row,
  score,
  onOpen,
}: {
  row: PortalDatabaseRow;
  score: number;
  onOpen: () => void;
}) {
  const title = assetNameForRow(row);
  const status = assetStatusForRow(row);
  const pillar = pillarForRow(row);
  const assetType = assetTypeForRow(row);
  const geography = geographyForRow(row) || "Geography pending";
  const amount = rowCapitalValue(row);
  const nda = ndaForRow(row);
  const teaser = teaserForRow(row);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.07] via-white/[0.025] to-black/20 p-5 text-left shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-glow-sm"
    >
      <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[5rem] bg-gold/10 blur-2xl transition group-hover:bg-gold/20" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-gold">Asset status</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-200">
              {status}
            </span>
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-chalk">{title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{teaser}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-gold/25 bg-gold/10 px-3 py-2 text-center">
          <div className="text-2xl font-semibold text-gold">{score}</div>
          <div className="label-mono text-muted">Fit</div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-2 text-xs text-chalk/75 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="label-mono text-muted">Pillar</div>
          <div className="mt-1 truncate">{pillar}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="label-mono text-muted">Asset Type</div>
          <div className="mt-1 truncate">{assetType}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="label-mono text-muted">Geography</div>
          <div className="mt-1 truncate">{geography}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="label-mono text-muted">Visible Value</div>
          <div className="mt-1">{compactMoney(amount)}</div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <span className="truncate text-xs text-muted">{sbfSourceLabel(row.sourceTitle)}</span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-chalk/70">
          {nda}
        </span>
      </div>
    </button>
  );
}

function MatchingEnginePanel({
  portal,
  email,
  onRefresh,
}: {
  portal: DynamicPortalPage | null;
  email: string;
  onRefresh: () => Promise<void>;
}) {
  const [filters, setFilters] = useState<MatchingFilters>(matchingDefaultFilters);
  const [selectedBuyBoxId, setSelectedBuyBoxId] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [selected, setSelected] = useState<{ row: PortalDatabaseRow; score: number } | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestLoading, setRequestLoading] = useState("");

  const allCandidates = useMemo(() => matchingRowsForPortal(portal), [portal]);
  const buyBoxes = useMemo(() => rowsForPortalView(portal, "buy-box"), [portal]);
  const selectedBuyBox = useMemo(
    () => buyBoxes.find((item) => item.id === selectedBuyBoxId) ?? null,
    [buyBoxes, selectedBuyBoxId],
  );
  const scored = useMemo(() => {
    const q = [filters.assetClass, filters.geography, filters.budget, filters.mandate, filters.ndaStatus, filters.proofOfFunds]
      .join(" ")
      .trim();

    return allCandidates
      .map((row) => ({ row, score: scoreMatchRow(row, filters) }))
      .filter((item) => (q ? item.score >= 28 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [allCandidates, filters]);

  const applyBuyBox = (rowId: string) => {
    setSelectedBuyBoxId(rowId);
    const row = buyBoxes.find((item) => item.id === rowId);
    if (!row) {
      setFilters(matchingDefaultFilters);
      setHasRun(false);
      return;
    }

    setFilters({
      buyerName: fieldValue(row.fields, ["investor", "buyer", "buyer name", "investor name", "owner"]) || "",
      assetClass: fieldValue(row.fields, ["asset class", "asset type", "property type", "pillar"]) || "",
      budget: fieldValue(row.fields, ["budget", "max price", "maximum price", "check size", "capital", "target size"]) || "",
      geography: fieldValue(row.fields, ["geography", "geographic focus", "market", "region", "location"]) || "",
      mandate: fieldValue(row.fields, ["mandate criteria", "criteria", "buy box", "investment criteria", "notes"]) || row.title,
      ndaStatus: fieldValue(row.fields, ["nda status", "nda"]) || "",
      proofOfFunds: fieldValue(row.fields, ["proof of funds status", "proof of funds", "pof status"]) || "",
    });
    setHasRun(false);
  };

  const requestAdminAction = async (submissionType: "full-reveal" | "lock-request") => {
    if (!selected || !email) return;
    setRequestError("");
    setRequestStatus("");
    setRequestLoading(submissionType);

    try {
      const target = assetNameForRow(selected.row);
      const response = await fetch("/api/notion/portal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          submissionType,
          fields: {
            "Request Action": submissionType === "full-reveal" ? "Request full teaser / full reveal" : "Request project lock",
            "Target Record ID": selected.row.id,
            "Target Record Title": target,
            "Target Source": sbfSourceLabel(selected.row.sourceTitle),
            "Asset / match / item name": target,
            "Asset class": assetTypeForRow(selected.row),
            Geography: geographyForRow(selected.row),
            Budget: fieldValue(selected.row.fields, ["value", "price", "budget", "deal size", "asking"]),
            "NDA status": ndaForRow(selected.row),
            "Notes / special requirements": submissionType === "full-reveal"
              ? "Partner requested full teaser / full reveal access from the Matching Engine card. Admin approval required before deeper details appear."
              : "Partner requested project lock / hold review from the Matching Engine card. Admin must approve or reject the lock.",
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to create admin request.");
      setRequestStatus(`${submissionType === "full-reveal" ? "Full reveal" : "Project lock"} request sent to admin. It will appear in Crystal/Aly Admin OS and your notification bar updates after approval.`);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Unable to send this request to admin.");
    } finally {
      setRequestLoading("");
    }
  };

  const saveMatchToNotion = async () => {
    if (!selected || !selectedBuyBoxId || !email) return;
    setRequestError("");
    setRequestStatus("");
    setRequestLoading("save-match");
    try {
      const response = await fetch("/api/notion/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          buyBoxId: selectedBuyBoxId,
          assetId: selected.row.id,
          score: selected.score,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to save this match.");
      setRequestStatus("New match saved to 08 — Matching Engine — CORE and added to Brad Match History.");
      await onRefresh();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Unable to save this match to SBF WORLD.");
    } finally {
      setRequestLoading("");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gold/15">
        <div className="bg-gradient-to-br from-gold/[0.08] to-transparent p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
            <div className="label-mono text-gold">Brad Matching Engine</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">Match a live buy box to SBF WORLD assets</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
                Select one of Brad’s Notion buy boxes and run it against the 120 Brad-visible asset records. Results appear below ranked by matching score.
            </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Candidate pool" value={allCandidates.length} sub="Brad-visible only" />
              <MetricCard label="Ranked results" value={hasRun ? scored.length : "—"} sub="Top 20 matches" />
              <MetricCard label="Buy boxes" value={buyBoxes.length} sub="Live Notion records" />
            </div>
          </div>
        </div>

        <form
            className="space-y-4 border-t border-white/[0.06] p-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedBuyBoxId) return;
              setHasRun(true);
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="block">
              <span className="label-mono text-gold">Brad’s live buy box</span>
              <select
                value={selectedBuyBoxId}
                onChange={(event) => applyBuyBox(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gold/25 bg-ink-850 px-4 py-3 text-sm text-chalk outline-none transition-all focus:border-gold/60 focus:shadow-glow-sm"
              >
                  <option value="">Choose a buy box to match…</option>
                {buyBoxes.map((row) => (
                  <option key={row.id} value={row.id}>{rowPrimaryLabel(row)}</option>
                ))}
              </select>
            </label>
              <Button type="submit" icon={Icon.pulse(16)} disabled={!selectedBuyBoxId}>
                Run Match
              </Button>
            </div>

            {selectedBuyBox && (
              <div className="rounded-2xl border border-gold/15 bg-gold/[0.035] p-4">
                <div className="text-sm font-medium text-chalk">{rowPrimaryLabel(selectedBuyBox)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["Asset class", filters.assetClass],
                    ["Geography", filters.geography],
                    ["Budget", filters.budget],
                    ["NDA", filters.ndaStatus],
                    ["POF", filters.proofOfFunds],
                  ].filter(([, value]) => value).map(([label, value]) => (
                    <span key={label} className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs text-chalk/75">
                      <span className="text-muted">{label}:</span> {value}
                    </span>
                  ))}
                </div>
                {filters.mandate && <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">{filters.mandate}</p>}
              </div>
            )}
          </form>
      </Card>

      {hasRun && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-gold/20 bg-gold/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="label-mono text-gold">Ranked match results</div>
              <h3 className="mt-1 text-lg font-semibold text-chalk">{selectedBuyBox ? rowPrimaryLabel(selectedBuyBox) : "Selected buy box"}</h3>
              <p className="mt-1 text-xs text-muted">Highest matching score appears first. Select a result to review and save it to SBF WORLD.</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-center">
              <div className="text-2xl font-semibold text-gold">{scored.length}</div>
              <div className="label-mono text-muted">Matches</div>
            </div>
          </div>

          {scored.length ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {scored.map((item) => (
                <MatchTeaserCard
                  key={`${item.row.sourceTitle ?? "source"}-${item.row.id}`}
                  row={item.row}
                  score={item.score}
                  onOpen={() => { setSelected(item); setShowMore(false); setRequestStatus(""); setRequestError(""); }}
                />
              ))}
            </div>
          ) : (
            <EmptySectionNote title="No teaser matches found" />
          )}
        </>
      )}

      {!hasRun && (
        <Card className="p-6">
          <div className="text-sm font-medium text-chalk">Ready to match</div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add Brad’s mandate criteria and run the engine. It will scan the live SBF WORLD candidate pool and return card-based teaser records instead of dumping every CORE record onto the page like a cursed spreadsheet waterfall.
          </p>
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? assetNameForRow(selected.row) : "Teaser"}
        sub={selected ? `${selected.score}/99 match fit · ${assetStatusForRow(selected.row)} · ${sbfSourceLabel(selected.row.sourceTitle)}` : undefined}
        width="max-w-3xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label-mono text-gold">Partner-safe teaser</span>
                <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-chalk/70">{assetStatusForRow(selected.row)}</span>
                <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-chalk/70">{pillarForRow(selected.row)}</span>
                <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-chalk/70">{assetTypeForRow(selected.row)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-chalk/80">{teaserForRow(selected.row)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {partnerVisibleDetails(selected.row, showMore).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <div className="label-mono text-muted">{label}</div>
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-chalk/80">{value}</div>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border border-gold/15 bg-[linear-gradient(145deg,rgba(212,175,55,0.06),rgba(0,0,0,0.2))]">
              <div className="border-b border-white/[0.06] p-4">
                <div className="label-mono text-gold">Next action</div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                  Save this match to SBF WORLD, request a project lock, or ask admin for the full reveal. Crystal/Aly will review protected actions in Admin OS. This record remains attributed to {email || "the logged-in partner"}.
                </p>
                {hasFullRevealAccess(selected.row) && (
                  <div className="mt-2 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-200">Full reveal approved</div>
                )}
                {requestStatus && <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">{requestStatus}</div>}
                {requestError && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{requestError}</div>}
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Button className="w-full" disabled={Boolean(requestLoading) || !selectedBuyBoxId} onClick={() => void saveMatchToNotion()}>
                  {requestLoading === "save-match" ? "Saving match…" : "Save match to SBF WORLD"}
                </Button>
                <Button className="w-full" variant="outline" disabled={Boolean(requestLoading)} onClick={() => requestAdminAction("lock-request")}>
                  {requestLoading === "lock-request" ? "Sending…" : "Request lock"}
                </Button>
                <Button className="w-full" variant="outline" disabled={Boolean(requestLoading)} onClick={() => requestAdminAction("full-reveal")}>
                  {requestLoading === "full-reveal" ? "Sending…" : "Request full reveal"}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setShowMore((value) => !value)}>
                  {showMore ? "Show teaser only" : "Learn more about teaser"}
                </Button>
                <Button className="w-full sm:col-span-2 lg:col-span-2" variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateUnderwritingPanel({ portal, email, onCreated }: { portal: DynamicPortalPage | null; email: string; onCreated: () => Promise<void> }) {
  const assets = rowsForPortalView(portal, "assets");
  const underwriting = rowsForPortalView(portal, "underwriting");
  const relatedText = underwriting.map((row) => `${row.title} ${Object.values(row.fields).join(" ")}`.toLowerCase()).join(" | ");
  const available = assets.filter((asset) => {
    const name = assetNameForRow(asset).toLowerCase();
    const status = fieldValue(asset.fields, ["underwriting status", "underwriting", "diligence status"]);
    return !/complete|completed|approved|underwritten|in progress|in review|requested/i.test(status) && !relatedText.includes(name);
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const create = async (asset: PortalDatabaseRow) => {
    setBusy(asset.id); setNotice("");
    try {
      const response = await fetch("/api/notion/underwriting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, assetId: asset.id }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to create underwriting.");
      setNotice(`${assetNameForRow(asset)} was added to Underwriting Engine — CORE.`);
      await onCreated();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create underwriting."); }
    finally { setBusy(""); }
  };
  return <Card className="overflow-hidden border-gold/20"><CardHeader title="Create Underwriting" sub="Create an underwriting record for any of your assets that does not already have one." action={<Button onClick={() => setOpen(true)} disabled={!available.length}><span className="mr-2 inline-flex">{Icon.plus(17)}</span>Create underwriting</Button>} /><div className="p-5 text-sm text-muted"><span className="text-gold">{available.length}</span> asset{available.length === 1 ? "" : "s"} currently available for underwriting.</div><Modal open={open} onClose={() => setOpen(false)} title="Create underwriting" sub="Assets without an existing underwriting record" width="max-w-4xl"><div className="space-y-3">{notice && <div className="rounded-xl border border-gold/25 bg-gold/10 p-3 text-sm text-gold">{notice}</div>}{available.length ? available.map((asset) => <div key={asset.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium text-chalk">{assetNameForRow(asset)}</div><div className="mt-1 text-xs text-muted">{assetTypeForRow(asset)} · {geographyForRow(asset) || "Market pending"}</div></div><Button size="sm" onClick={() => void create(asset)} disabled={Boolean(busy)}>{busy === asset.id ? "Creating…" : "Create underwriting"}</Button></div>) : <div className="rounded-xl border border-white/[0.07] p-5 text-sm text-muted">All visible assets already have underwriting or a request in progress.</div>}</div></Modal></Card>;
}

export default function DynamicPortalDashboard({ view = "overview" }: { view?: PortalView }) {
  const { session, ready } = useSession();
  const [portal, setPortal] = useState<DynamicPortalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPortal = useCallback(async () => {
    if (!session?.email) {
      setLoading(false);
      setError("No active portal session found. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/notion/portal/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.email, user: session }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to fetch portal.");
      setPortal(payload.data as DynamicPortalPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch portal.");
    } finally {
      setLoading(false);
    }
  }, [session?.email]);

  useEffect(() => {
    if (!ready) return;
    void loadPortal();
  }, [ready, loadPortal]);

  const user = portal?.user ?? session;
  const fields = portal?.user.rawFields ?? {};
  const meta = viewCopy[view];
  const kpis = useMemo(
    () => [
      { label: "Portal Role", value: user?.role ?? "—", icon: Icon.users(18) },
      { label: "Access Level", value: user?.accessLevel || fieldValue(fields, ["access level"]) || "—", icon: Icon.layers(18) },
      { label: "Status", value: portal?.user.status ?? "active", icon: Icon.shield(18) },
      { label: "Contact ID", value: user?.contactId || fieldValue(fields, ["contact id"]) || "—", icon: Icon.deals(18) },
    ],
    [fields, portal?.user.status, user?.accessLevel, user?.contactId, user?.role],
  );

  if (!ready || loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="SBF WORLD Portal" title="Loading live portal" desc="Fetching Brad-scoped portal data from SBF WORLD CORE." />
        <Card className="p-6 text-sm text-muted">Reading SBF WORLD CORE. The spreadsheet empire is being politely interrogated.</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="SBF WORLD Portal" title="Portal unavailable" desc="The login worked, but the assigned SBF WORLD portal could not be loaded." />
        <Card className="p-6 text-sm text-red-200">{error}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {view !== "investors" && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <PageHeader eyebrow={meta.eyebrow} title={meta.title} desc={meta.desc} />
          <div className="shrink-0 pt-1"><NotionLiveBadge source={portal?.title || "Partner Portal"} /></div>
        </div>
      )}

      {view === "overview" ? (
        <SimpleCommandCenter portal={portal} user={user} onRefresh={loadPortal} />
      ) : (
        <>
          {view !== "investors" && <PortalChartOverview portal={portal} view={view} />}

          {(view === "submissions" || view === "buy-box" || view === "intake") && (
            <LiveSubmissionSyncPanel portal={portal} onRefresh={loadPortal} />
          )}

          {view === "identity" && <IdentityPanel portal={portal} user={user} fields={fields} />}
        </>
      )}

      {view === "matches" && (
        <>
          <RecordCardDeck portal={portal} view="matches" title="Active Match Command" subtitle="Brad-safe teaser records and deal-flow cards. Only approved records connected to this partner appear here." />
          <SectionCollection portal={portal} keys={["active-matches", "deal-flow", "matching", "matches"]} emptyTitle="Active matches and deal flow" />
          <RulesPanel portal={portal} />
        </>
      )}

      {view === "assets" && (
        <>
          <RecordCardDeck portal={portal} view="assets" title="Brad Assets Command" subtitle="All Brad-scoped assets and SBF Vault signals in card form, with search, pagination, visible value, status, and next action." />
          <SectionCollection portal={portal} keys={["assets", "buy-box-signals", "sbf vault", "signals"]} emptyTitle="Assets and buy box signals" />
          <CommandBlocks portal={portal} />
        </>
      )}

      {view === "investors" && (
        <>
          <RecordCardDeck portal={portal} view="investors" title="Investor / Buyer / Lender Command" subtitle="Brad-scoped capital relationships from 04 — Investors, Buyers & Lenders — CORE, including status, organization, primary contact, role, and activation status." />
          <RulesPanel portal={portal} />
        </>
      )}

      {view === "underwriting" && (
        <>
          <CreateUnderwritingPanel portal={portal} email={user?.email ?? ""} onCreated={loadPortal} />
          <RecordCardDeck portal={portal} view="underwriting" title="Underwriting Output Deck" subtitle="Partner-visible underwriting and diligence outputs only. Protected notes and internal strategy stay hidden." />
          <SectionCollection portal={portal} keys={["underwritten", "underwriting", "diligence", "documents"]} emptyTitle="Approved underwriting outputs" />
          <RulesPanel portal={portal} />
        </>
      )}

      {view === "buy-box" && (
        <>
          <RecordCardDeck portal={portal} view="buy-box" title="Buy Box & Mandate Command" subtitle="Live buy boxes, mandates, and signals connected to this partner, shown before the submission router." />
          <SectionCollection portal={portal} keys={["buy-box", "buy box", "mandate", "signals"]} emptyTitle="Buy box and mandate signals" />
          <PartnerSubmissionForms email={user?.email ?? ""} quickActions={["Add or update buy box", "Submit new asset", "Request intro / next step", "Flag item for CORE review"]} onSubmitted={loadPortal} />
        </>
      )}

      {view === "matching-engine" && (
        <>
          <MatchingEnginePanel portal={portal} email={user?.email ?? ""} onRefresh={loadPortal} />
          <RecordCardDeck
            portal={portal}
            view="matches"
            title="Brad Match History"
            subtitle="New and historical Brad-scoped match records from 08 — Matching Engine — CORE. Open a record to review its current Notion status and partner-safe details."
          />
        </>
      )}

      {view === "documents" && (
        <>
          <RecordCardDeck portal={portal} view="documents" title="Documents & Diligence Deck" subtitle="Partner-visible documents, teaser files, reveal status, and diligence records in a readable card system." />
          <SectionCollection portal={portal} keys={["documents", "diligence", "teaser", "full reveal"]} emptyTitle="Documents and diligence" />
          <PartnerSubmissionForms email={user?.email ?? ""} quickActions={["Attach document links", "Request full reveal", "Request underwriting support"]} onSubmitted={loadPortal} />
        </>
      )}

      {view === "submissions" && (
        <>
          <RecordCardDeck portal={portal} view="submissions" title="Submission Status Board" subtitle="Brad-attributed submissions, support requests, document uploads, matching requests, and underwriting routes with 20-card pagination." />
          <SectionCollection portal={portal} keys={["submissions", "support", "requests", "intake"]} emptyTitle="My submissions" />
          <PartnerSubmissionForms email={user?.email ?? ""} quickActions={portal?.quickActions ?? []} onSubmitted={loadPortal} />
        </>
      )}

      {view === "intake" && (
        <>
          <PartnerSubmissionForms email={user?.email ?? ""} quickActions={portal?.quickActions ?? []} onSubmitted={loadPortal} />
          <SectionCollection portal={portal} keys={["workflow", "routing", "command"]} emptyTitle="Workflow and routing" />
        </>
      )}

      {view === "support" && (
        <>
          <RecordCardDeck portal={portal} view="support" title="Support Routing Board" subtitle="Support requests and routing records connected to this partner, aligned as status cards before the request form." />
          <PartnerSubmissionForms email={user?.email ?? ""} quickActions={["Flag item for CORE review", "Request intro / next step", "Request underwriting support", "Confirm JV logic for a submission"]} onSubmitted={loadPortal} />
          <SectionCollection portal={portal} keys={["support", "requests", "workflow"]} emptyTitle="Support requests" />
        </>
      )}

      {view === "rules" && <RulesPanel portal={portal} />}

      {view === "command" && <CommandBlocks portal={portal} />}
    </div>
  );
}
