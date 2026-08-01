"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icons";
import { DEALS, MARKET_LISTINGS, fmtMoney } from "@/lib/data";
import type { Pillar, Role } from "@/lib/types";

const PILLARS: Pillar[] = ["Real Estate", "Business", "Capital", "SBF Vault"];

type MatchAsset = {
  id: string;
  title: string;
  pillar: Pillar;
  value: number;
  risk: number;
  location: string;
  returnProfile: number;
  source: "Deal Pipeline" | "Global SBF Vault";
};

const globalAssets: MatchAsset[] = [
  ...DEALS.map((deal) => ({
    id: deal.id,
    title: deal.title,
    pillar: deal.pillar,
    value: deal.value,
    risk: deal.risk,
    location: deal.location,
    returnProfile: deal.roi,
    source: "Deal Pipeline" as const,
  })),
  ...MARKET_LISTINGS.map((listing) => ({
    id: listing.id,
    title: listing.title,
    pillar: listing.category,
    value: listing.price,
    risk: listing.risk,
    location: listing.location,
    returnProfile: listing.yield || listing.match / 4,
    source: "Global SBF Vault" as const,
  })),
];

const field =
  "w-full rounded-lg border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm text-chalk placeholder:text-muted/60 outline-none transition-colors focus:border-gold/50 focus:shadow-glow-sm";
const label = "label-mono mb-1.5 block text-muted";

const roleLabel: Record<Role, string> = {
  admin: "System",
  member: "Member",
  investor: "Investor",
  partner: "Partner",
  lender: "Lender",
};

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50_000_000;
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function regionMatch(location: string, geography: string) {
  if (geography === "Global") return true;
  const haystack = location.toLowerCase();
  return geography
    .toLowerCase()
    .split(",")
    .some((part) => part.trim() && haystack.includes(part.trim()));
}

export default function MatchingEngine({ role }: { role: Role }) {
  const [assetTitle, setAssetTitle] = useState("");
  const [assetPillar, setAssetPillar] = useState<Pillar>("Real Estate");
  const [assetValue, setAssetValue] = useState("50000000");
  const [assetLocation, setAssetLocation] = useState("");
  const [assetFile, setAssetFile] = useState("");
  const [submittedAsset, setSubmittedAsset] = useState(false);

  const [buyPillar, setBuyPillar] = useState<Pillar>("Real Estate");
  const [buyBudget, setBuyBudget] = useState("100000000");
  const [buyMaxRisk, setBuyMaxRisk] = useState("55");
  const [buyMinReturn, setBuyMinReturn] = useState("10");
  const [buyGeography, setBuyGeography] = useState("Global");
  const [matched, setMatched] = useState(false);

  const matches = useMemo(() => {
    const budget = parseMoney(buyBudget);
    const maxRisk = parseNumber(buyMaxRisk, 55);
    const minReturn = parseNumber(buyMinReturn, 10);

    return globalAssets
      .map((asset) => {
        const pillarScore = asset.pillar === buyPillar ? 35 : 8;
        const budgetScore = asset.value <= budget ? 25 : Math.max(0, 25 - ((asset.value - budget) / budget) * 25);
        const riskScore = asset.risk <= maxRisk ? 20 : Math.max(0, 20 - (asset.risk - maxRisk));
        const returnScore = asset.returnProfile >= minReturn ? 12 : Math.max(0, 12 - (minReturn - asset.returnProfile));
        const geoScore = regionMatch(asset.location, buyGeography) ? 8 : 0;
        const score = Math.max(0, Math.min(99, Math.round(pillarScore + budgetScore + riskScore + returnScore + geoScore)));

        return { ...asset, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [buyBudget, buyGeography, buyMaxRisk, buyMinReturn, buyPillar]);

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader
        title={`${roleLabel[role]} Matching Engine`}
        sub="Submit an asset or buy box, then match it against the global asset universe."
        action={
          <span className="hidden rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-medium text-gold sm:inline-flex">
            Global assets: {globalAssets.length}
          </span>
        }
      />

      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="label-mono text-gold">Asset Submission</div>
              <p className="mt-1 text-xs text-muted">
                Upload or submit an owned asset into the matching queue.
              </p>
            </div>
            {submittedAsset && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                Submitted
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Asset Title</label>
              <input
                className={field}
                value={assetTitle}
                onChange={(event) => setAssetTitle(event.target.value)}
                placeholder="e.g. Class A logistics portfolio"
              />
            </div>
            <div>
              <label className={label}>Pillar</label>
              <select
                className={field}
                value={assetPillar}
                onChange={(event) => setAssetPillar(event.target.value as Pillar)}
              >
                {PILLARS.map((pillar) => (
                  <option key={pillar} value={pillar} className="bg-ink-850">
                    {pillar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Asset Value</label>
              <input
                className={field}
                value={assetValue}
                onChange={(event) => setAssetValue(event.target.value)}
                placeholder="50000000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Location</label>
              <input
                className={field}
                value={assetLocation}
                onChange={(event) => setAssetLocation(event.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Upload Asset File</label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-white/15 bg-ink-850/60 px-3.5 py-3 text-sm transition-colors hover:border-gold/40">
                <span className="truncate text-muted">
                  {assetFile || "Upload deck, data room export, model, or teaser"}
                </span>
                <span className="shrink-0 text-gold">{Icon.doc(16)}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setAssetFile(event.target.files?.[0]?.name || "")}
                />
              </label>
            </div>
          </div>

          <Button
            className="mt-5"
            full
            variant="outline"
            icon={Icon.plus(16)}
            onClick={() => setSubmittedAsset(true)}
          >
            Submit Asset
          </Button>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="label-mono text-gold">Buy Box Submission</div>
              <p className="mt-1 text-xs text-muted">
                Define mandate criteria and match against global assets.
              </p>
            </div>
            {matched && (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] text-gold">
                Match run complete
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Target Pillar</label>
              <select
                className={field}
                value={buyPillar}
                onChange={(event) => setBuyPillar(event.target.value as Pillar)}
              >
                {PILLARS.map((pillar) => (
                  <option key={pillar} value={pillar} className="bg-ink-850">
                    {pillar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Max Budget</label>
              <input
                className={field}
                value={buyBudget}
                onChange={(event) => setBuyBudget(event.target.value)}
                placeholder="100000000"
              />
            </div>
            <div>
              <label className={label}>Max Risk Score</label>
              <input
                className={field}
                type="number"
                min="0"
                max="100"
                value={buyMaxRisk}
                onChange={(event) => setBuyMaxRisk(event.target.value)}
              />
            </div>
            <div>
              <label className={label}>Min Return / Yield</label>
              <input
                className={field}
                type="number"
                min="0"
                value={buyMinReturn}
                onChange={(event) => setBuyMinReturn(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Geography</label>
              <input
                className={field}
                value={buyGeography}
                onChange={(event) => setBuyGeography(event.target.value)}
                placeholder="Global, New York, Dubai, London..."
              />
            </div>
          </div>

          <Button
            className="mt-5"
            full
            icon={Icon.search(16)}
            onClick={() => setMatched(true)}
          >
            Submit Buy Box & Match
          </Button>

          {matched && (
            <div className="mt-5 space-y-2.5">
              {matches.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-xl border border-white/[0.06] bg-ink-850/45 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-gold">{asset.id}</div>
                      <div className="truncate text-sm font-medium text-chalk">{asset.title}</div>
                      <div className="mt-1 text-[11px] text-muted">
                        {asset.source} / {asset.pillar} / {asset.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg text-gold">{asset.score}%</div>
                      <div className="label-mono text-muted">Match</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-muted">
                      Size <span className="block font-mono text-chalk">{fmtMoney(asset.value)}</span>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-muted">
                      Risk <span className="block font-mono text-chalk">{asset.risk}</span>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-muted">
                      Return <span className="block font-mono text-chalk">{asset.returnProfile.toFixed(1)}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
