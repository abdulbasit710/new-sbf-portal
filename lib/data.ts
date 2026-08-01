import type {
  Deal,
  MarketListing,
  AuditEntry,
  SystemUser,
  CPStage,
  Role,
} from "./types";

export const CP_STAGES: { stage: CPStage; label: string }[] = [
  { stage: "CP1", label: "Origination" },
  { stage: "CP2", label: "Screening" },
  { stage: "CP3", label: "Underwriting" },
  { stage: "CP4", label: "Structuring" },
  { stage: "CP5", label: "Committee" },
  { stage: "CP6", label: "Funding" },
  { stage: "CP7", label: "Deployment" },
];

export const stageIndex = (s: CPStage) =>
  CP_STAGES.findIndex((c) => c.stage === s);

export const PILLAR_CODE: Record<string, string> = {
  "Real Estate": "RE",
  Business: "BIZ",
  Capital: "CAP",
  "SBF Vault": "VAULT",
};

const fin = (capex: string, equity: string, dscr: string, exit: string) => [
  { label: "Total Capitalization", value: capex },
  { label: "Equity Required", value: equity },
  { label: "DSCR", value: dscr },
  { label: "Target Exit", value: exit },
];

const docs = (verified = 2) => [
  {
    name: "Investment_Memorandum.pdf",
    type: "PDF",
    size: "4.2 MB",
    uploaded: "2026-06-12",
    status: "verified" as const,
  },
  {
    name: "Financial_Model_v3.xlsx",
    type: "XLSX",
    size: "1.8 MB",
    uploaded: "2026-06-11",
    status: verified > 1 ? ("verified" as const) : ("pending" as const),
  },
  {
    name: "Title_Report.pdf",
    type: "PDF",
    size: "920 KB",
    uploaded: "2026-06-09",
    status: "pending" as const,
  },
  {
    name: "Sponsor_Track_Record.pdf",
    type: "PDF",
    size: "2.1 MB",
    uploaded: "2026-06-08",
    status: "flagged" as const,
  },
];

export const DEALS: Deal[] = [
  {
    id: "SBF-0481",
    title: "Meridian Tower — Class A Acquisition",
    pillar: "Real Estate",
    stage: "CP5",
    status: "review",
    risk: 28,
    value: 142_000_000,
    roi: 19.4,
    ltv: 62,
    location: "Manhattan, NY",
    sponsor: "Aurora Capital Partners",
    updated: "2026-06-19",
    created: "2026-05-02",
    matchScore: 94,
    summary:
      "Acquisition of a 41-story Class A office tower in Midtown with a stabilized rent roll, anchored by investment-grade tenants on long-dated leases.",
    financials: fin("$142.0M", "$54.0M", "1.62x", "Year 5 — Refinance"),
    documents: docs(2),
  },
  {
    id: "SBF-0479",
    title: "Helios Solar Portfolio — Series B",
    pillar: "Capital",
    stage: "CP3",
    status: "active",
    risk: 41,
    value: 78_500_000,
    roi: 22.1,
    ltv: 55,
    location: "Austin, TX",
    sponsor: "Helios Infrastructure",
    updated: "2026-06-18",
    created: "2026-05-14",
    matchScore: 88,
    summary:
      "Growth capital deployment across a 420MW operational solar portfolio with contracted offtake and inflation-linked PPAs.",
    financials: fin("$78.5M", "$35.3M", "1.48x", "Year 7 — Sale"),
    documents: docs(1),
  },
  {
    id: "SBF-0476",
    title: "Atlas Logistics Roll-Up",
    pillar: "Business",
    stage: "CP6",
    status: "approved",
    risk: 33,
    value: 96_200_000,
    roi: 24.8,
    ltv: 58,
    location: "Rotterdam, NL",
    sponsor: "Atlas Operating Group",
    updated: "2026-06-17",
    created: "2026-04-21",
    matchScore: 91,
    summary:
      "Buy-and-build consolidation of regional last-mile logistics operators with synergistic EBITDA expansion thesis.",
    financials: fin("$96.2M", "$40.4M", "1.71x", "Year 4 — Strategic Sale"),
    documents: docs(2),
  },
  {
    id: "SBF-0470",
    title: "Sovereign Bridge Facility",
    pillar: "Capital",
    stage: "CP7",
    status: "funded",
    risk: 19,
    value: 210_000_000,
    roi: 14.2,
    ltv: 48,
    location: "Singapore",
    sponsor: "Sovereign Credit Fund III",
    updated: "2026-06-15",
    created: "2026-03-30",
    matchScore: 97,
    summary:
      "Senior secured bridge facility to a sovereign-linked infrastructure platform pending long-term bond issuance.",
    financials: fin("$210.0M", "$0", "2.10x", "18 Months — Refinance"),
    documents: docs(2),
  },
  {
    id: "SBF-0468",
    title: "Lumen Biotech — Growth Round",
    pillar: "Business",
    stage: "CP2",
    status: "review",
    risk: 67,
    value: 34_000_000,
    roi: 38.5,
    ltv: 0,
    location: "Boston, MA",
    sponsor: "Lumen Therapeutics",
    updated: "2026-06-14",
    created: "2026-06-01",
    matchScore: 72,
    summary:
      "Late-stage growth equity into a clinical biotech with Phase III readouts and a defensible IP moat.",
    financials: fin("$34.0M", "$34.0M", "n/a", "Year 6 — IPO"),
    documents: docs(1),
  },
  {
    id: "SBF-0461",
    title: "Coastal Resort Development",
    pillar: "Real Estate",
    stage: "CP4",
    status: "active",
    risk: 52,
    value: 118_000_000,
    roi: 27.3,
    ltv: 65,
    location: "Tulum, MX",
    sponsor: "Costa Development Co.",
    updated: "2026-06-13",
    created: "2026-04-08",
    matchScore: 81,
    summary:
      "Ground-up development of a 220-key luxury eco-resort with branded residences and a phased sell-down strategy.",
    financials: fin("$118.0M", "$48.0M", "1.35x", "Year 5 — Sell-down"),
    documents: docs(1),
  },
  {
    id: "SBF-0455",
    title: "Nexus Data Center — Phase II",
    pillar: "Real Estate",
    stage: "CP6",
    status: "approved",
    risk: 24,
    value: 305_000_000,
    roi: 17.6,
    ltv: 60,
    location: "Frankfurt, DE",
    sponsor: "Nexus Digital Infra",
    updated: "2026-06-11",
    created: "2026-03-12",
    matchScore: 95,
    summary:
      "Hyperscale data center expansion fully pre-leased to a top-tier cloud provider on a 15-year triple-net lease.",
    financials: fin("$305.0M", "$122.0M", "1.88x", "Year 10 — Hold"),
    documents: docs(2),
  },
  {
    id: "SBF-0449",
    title: "Veritas SBF Vault Equity",
    pillar: "SBF Vault",
    stage: "CP1",
    status: "active",
    risk: 58,
    value: 22_500_000,
    roi: 31.0,
    ltv: 0,
    location: "London, UK",
    sponsor: "Veritas Commerce",
    updated: "2026-06-10",
    created: "2026-06-05",
    matchScore: 69,
    summary:
      "Primary equity into a B2B procurement platform with strong net revenue retention and category leadership.",
    financials: fin("$22.5M", "$22.5M", "n/a", "Year 5 — Strategic Sale"),
    documents: docs(1),
  },
  {
    id: "SBF-0442",
    title: "Highline Multifamily Fund",
    pillar: "Real Estate",
    stage: "CP3",
    status: "rejected",
    risk: 74,
    value: 64_000_000,
    roi: 12.1,
    ltv: 78,
    location: "Phoenix, AZ",
    sponsor: "Highline Residential",
    updated: "2026-06-08",
    created: "2026-05-19",
    matchScore: 54,
    summary:
      "Value-add multifamily aggregation in a softening submarket; flagged on leverage and rent-growth assumptions.",
    financials: fin("$64.0M", "$14.0M", "1.08x", "Year 3 — Sale"),
    documents: docs(0),
  },
];

export const MARKET_LISTINGS: MarketListing[] = [
  {
    id: "MKT-901",
    title: "Prime Logistics Hub — Private Access",
    category: "Real Estate",
    price: 88_000_000,
    location: "Dallas, TX",
    match: 96,
    risk: 26,
    yield: 8.2,
  },
  {
    id: "MKT-902",
    title: "Healthcare SaaS — Majority Stake",
    category: "Business",
    price: 41_500_000,
    location: "Toronto, CA",
    match: 89,
    risk: 38,
    yield: 0,
  },
  {
    id: "MKT-903",
    title: "Mezzanine Credit Tranche",
    category: "Capital",
    price: 25_000_000,
    location: "New York, NY",
    match: 92,
    risk: 31,
    yield: 11.4,
  },
  {
    id: "MKT-904",
    title: "Luxury Branded Residences",
    category: "Real Estate",
    price: 132_000_000,
    location: "Dubai, UAE",
    match: 84,
    risk: 44,
    yield: 6.9,
  },
  {
    id: "MKT-905",
    title: "Vertical Farming Platform",
    category: "Business",
    price: 19_800_000,
    location: "Amsterdam, NL",
    match: 71,
    risk: 61,
    yield: 0,
  },
  {
    id: "MKT-906",
    title: "Secondary LP Position — PE Fund VII",
    category: "Capital",
    price: 57_000_000,
    location: "Geneva, CH",
    match: 90,
    risk: 22,
    yield: 9.6,
  },
  {
    id: "MKT-907",
    title: "Curated Art & Collectibles Index",
    category: "SBF Vault",
    price: 14_200_000,
    location: "Hong Kong",
    match: 66,
    risk: 49,
    yield: 5.1,
  },
  {
    id: "MKT-908",
    title: "Grid-Scale Battery Storage",
    category: "Capital",
    price: 73_000_000,
    location: "Madrid, ES",
    match: 87,
    risk: 35,
    yield: 10.2,
  },
];

export const AUDIT_LOG: AuditEntry[] = [
  {
    id: "L-1042",
    actor: "admin@sbf.world",
    action: "Advanced stage CP4 → CP5",
    target: "SBF-0481",
    time: "2026-06-19 14:22",
    level: "info",
  },
  {
    id: "L-1041",
    actor: "underwriting.engine",
    action: "Risk score recalculated 31 → 28",
    target: "SBF-0481",
    time: "2026-06-19 14:21",
    level: "info",
  },
  {
    id: "L-1040",
    actor: "admin@sbf.world",
    action: "Rejected deal — leverage breach",
    target: "SBF-0442",
    time: "2026-06-18 09:51",
    level: "critical",
  },
  {
    id: "L-1039",
    actor: "j.partner@sbf.world",
    action: "Submitted new deal",
    target: "SBF-0449",
    time: "2026-06-18 08:30",
    level: "info",
  },
  {
    id: "L-1038",
    actor: "compliance.bot",
    action: "Document flagged — KYC mismatch",
    target: "SBF-0442",
    time: "2026-06-17 17:04",
    level: "warning",
  },
  {
    id: "L-1037",
    actor: "admin@sbf.world",
    action: "Approved funding release",
    target: "SBF-0470",
    time: "2026-06-15 11:12",
    level: "info",
  },
];

export const SYSTEM_USERS: SystemUser[] = [
  {
    id: "U-01",
    name: "Eleanor Voss",
    email: "e.voss@sbf.world",
    role: "admin",
    status: "active",
    lastSeen: "2m ago",
  },
  {
    id: "U-02",
    name: "Marcus Reed",
    email: "m.reed@sbf.world",
    role: "member",
    status: "active",
    lastSeen: "1h ago",
  },
  {
    id: "U-03",
    name: "Sofia Lindqvist",
    email: "s.lindqvist@capital.fund",
    role: "investor",
    status: "active",
    lastSeen: "3h ago",
  },
  {
    id: "U-04",
    name: "Devin Okafor",
    email: "d.okafor@referral.co",
    role: "partner",
    status: "invited",
    lastSeen: "—",
  },
  {
    id: "U-05",
    name: "Hana Yamamoto",
    email: "h.yamamoto@creditbank.com",
    role: "lender",
    status: "active",
    lastSeen: "20m ago",
  },
  {
    id: "U-06",
    name: "Theo Marchand",
    email: "t.marchand@sbf.world",
    role: "member",
    status: "suspended",
    lastSeen: "4d ago",
  },
];

export const ROLE_META: Record<
  Role,
  { label: string; tag: string; desc: string }
> = {
  admin: {
    label: "Administrator",
    tag: "FULL SYSTEM ACCESS",
    desc: "Complete control center — all deals, users, and CP overrides.",
  },
  member: {
    label: "Member",
    tag: "DEAL ORIGINATOR",
    desc: "Submit and track your own deals through the CP pipeline.",
  },
  investor: {
    label: "Investor",
    tag: "CAPITAL ALLOCATOR",
    desc: "Portfolio exposure, returns, and investable opportunities.",
  },
  partner: {
    label: "Partner",
    tag: "REFERRAL NETWORK",
    desc: "Referral performance, commissions, and conversion analytics.",
  },
  lender: {
    label: "Lender",
    tag: "DEBT PROVIDER",
    desc: "Loan exposure, LTV ratios, and capital commitments.",
  },
};

// Currency / number helpers
export const fmtMoney = (n: number, compact = true) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export const riskTier = (r: number) =>
  r < 35 ? "low" : r < 60 ? "moderate" : "elevated";

// Portfolio exposure derived from deals
export const PORTFOLIO_EXPOSURE = [
  { label: "Real Estate", value: 47, color: "#C8A24A" },
  { label: "Capital", value: 28, color: "#E3C879" },
  { label: "Business", value: 18, color: "#8A6D2A" },
  { label: "SBF Vault", value: 7, color: "#5A4A1E" },
];

export const CAPITAL_TREND = [
  62, 68, 74, 71, 83, 91, 97, 104, 112, 121, 129, 142,
];

export const RETURN_BARS = [
  { label: "Q1", value: 12.4 },
  { label: "Q2", value: 15.1 },
  { label: "Q3", value: 18.9 },
  { label: "Q4", value: 21.3 },
  { label: "Q1", value: 19.8 },
  { label: "Q2", value: 24.2 },
];
