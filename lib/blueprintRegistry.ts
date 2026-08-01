import type { Role } from "./types";

export type BlueprintModuleKey =
  | "universal-intake"
  | "people-members-relationships"
  | "partner-registry"
  | "investors-buyers-lenders"
  | "assets"
  | "buy-boxes-mandates"
  | "underwriting-engine"
  | "matching-engine"
  | "vault-controlled-reveal"
  | "deals-closing"
  | "documents-governance"
  | "events-member-access"
  | "payments-revenue-payouts"
  | "cigar-products-inventory-orders"
  | "pillar-hq-registry"
  | "founder-admin-command"
  | "partner-portal-template"
  | "investor-buyer-portal-template"
  | "lender-portal-template"
  | "sovereign-live-portal-activation"
  | "sovereign-activation-command"
  | "rhino-capital-lender-portal"
  | "underwriting-public-source-allowlist"
  | "live-activity-snapshot"
  | "business-partner-stats-brief"
  | "founder-admin-snapshot"
  | "consulting-playbook"
  | "consulting-command-center"
  | "consulting-guidance-engine"
  | "sovereign-partner-command-center"
  | "brad-gaubert-partner-command-center";

export interface BlueprintModule {
  key: BlueprintModuleKey;
  title: string;
  pageId: string;
  category: "core" | "portal" | "activation" | "snapshot" | "consulting";
  roles: Role[];
}

export const BLUEPRINT_MODULES: BlueprintModule[] = [
  {
    key: "universal-intake",
    title: "01 - Universal Intake - CORE",
    pageId: "b752dd46d2494018b25a6db52f12a1a4",
    category: "core",
    roles: ["admin", "member", "partner"],
  },
  {
    key: "people-members-relationships",
    title: "02 - People, Members & Relationships - CORE",
    pageId: "bc02941f95e148f289baf51e3b08f058",
    category: "core",
    roles: ["admin"],
  },
  {
    key: "partner-registry",
    title: "03 - Partner Registry - CORE",
    pageId: "36da8eaf38624c2fb4f7d44e72917443",
    category: "core",
    roles: ["admin", "partner"],
  },
  {
    key: "investors-buyers-lenders",
    title: "04 - Investors, Buyers & Lenders - CORE",
    pageId: "6d2a2e08436c450884c6f40c2e512b28",
    category: "core",
    roles: ["admin", "investor", "lender"],
  },
  {
    key: "assets",
    title: "05 - Assets - CORE",
    pageId: "050b3dfa5b9d47c688998595968f2594",
    category: "core",
    roles: ["admin", "member", "partner", "investor", "lender"],
  },
  {
    key: "buy-boxes-mandates",
    title: "06 - Buy Boxes & Mandates - CORE",
    pageId: "b1887568aed74d31abc906d40e108567",
    category: "core",
    roles: ["admin", "investor", "lender", "partner"],
  },
  {
    key: "underwriting-engine",
    title: "07 - Underwriting Engine - CORE",
    pageId: "40e869b554b4404c9f2a8ba5ba06835b",
    category: "core",
    roles: ["member", "investor", "partner", "lender"],
  },
  {
    key: "matching-engine",
    title: "08 - Matching Engine - CORE",
    pageId: "d5d3c5b00a0d4a31ac9d52b6ccc61275",
    category: "core",
    roles: ["admin", "member", "investor", "partner", "lender"],
  },
  {
    key: "vault-controlled-reveal",
    title: "09 - Vault & Controlled Reveal - CORE",
    pageId: "5d5de26d047b4d90aca6a79e6e093eca",
    category: "core",
    roles: ["admin", "investor", "lender"],
  },
  {
    key: "deals-closing",
    title: "10 - Deals, LOI, PSA & Closing - CORE",
    pageId: "97ec2ed04c034a80899afc6b2bc731b0",
    category: "core",
    roles: ["admin", "member", "partner", "investor", "lender"],
  },
  {
    key: "documents-governance",
    title: "11 - Documents & Governance - CORE",
    pageId: "de311c485171492daa14d0e88706a53f",
    category: "core",
    roles: ["admin", "member", "partner", "investor", "lender"],
  },
  {
    key: "events-member-access",
    title: "12 - Events & Member Access - CORE",
    pageId: "e5c94efccf134f14a61ecb760724865e",
    category: "core",
    roles: ["admin", "member", "partner"],
  },
  {
    key: "payments-revenue-payouts",
    title: "13 - Payments, Revenue & Payouts - CORE",
    pageId: "556f7c55ef96419baa62adec8ed4fb53",
    category: "core",
    roles: ["admin", "partner", "investor", "lender"],
  },
  {
    key: "cigar-products-inventory-orders",
    title: "14 - Cigar Products, Inventory & Orders - CORE",
    pageId: "3b52861d416a45cd9d0396e962d54002",
    category: "core",
    roles: ["admin", "partner"],
  },
  {
    key: "pillar-hq-registry",
    title: "15 - Pillar HQ Registry - CORE",
    pageId: "97ec43d7d14240ce980ce535566c17c1",
    category: "core",
    roles: ["admin"],
  },
  {
    key: "founder-admin-command",
    title: "Founder / Admin Command Portal",
    pageId: "127bb37003824e4fa4f9326715008263",
    category: "portal",
    roles: ["admin"],
  },
  {
    key: "partner-portal-template",
    title: "Partner Portal - Master Template",
    pageId: "cc9b5103512248a5bac90c6f25267dbd",
    category: "portal",
    roles: ["admin", "partner"],
  },
  {
    key: "investor-buyer-portal-template",
    title: "Investor / Buyer Portal - Master Template",
    pageId: "765640e80da84e63b448b4ca947f5d76",
    category: "portal",
    roles: ["admin", "investor"],
  },
  {
    key: "lender-portal-template",
    title: "Lender Portal - Master Template",
    pageId: "88429f77c2c047ccbcf2d34111afb509",
    category: "portal",
    roles: ["admin", "lender"],
  },
  {
    key: "sovereign-live-portal-activation",
    title: "Sovereign Integration Blueprint - Next.js Live Portal Activation",
    pageId: "3a20bb331c284b409b5b872b9db180dd",
    category: "activation",
    roles: ["admin"],
  },
  {
    key: "sovereign-activation-command",
    title: "Sovereign Activation Command - God's Blueprint Capital Activation",
    pageId: "c3177dfde7d743cb9308dfda5afcaad5",
    category: "activation",
    roles: ["admin"],
  },
  {
    key: "rhino-capital-lender-portal",
    title: "Rhino Capital - Lender Portal",
    pageId: "54645d9a42614bacbb15ab7ee2b09a51",
    category: "portal",
    roles: ["admin", "lender"],
  },
  {
    key: "underwriting-public-source-allowlist",
    title: "SBF WORLD AI Underwriting - Public Source Allowlist",
    pageId: "4f11ed2f5dea41a38ebbf626901ccf31",
    category: "activation",
    roles: ["admin", "member", "investor", "partner", "lender"],
  },
  {
    key: "live-activity-snapshot",
    title: "SBF WORLD Platform - Live Activity Snapshot - July 2, 2026",
    pageId: "9d8b39e582ec4d6a902d5bad59cdfa89",
    category: "snapshot",
    roles: ["admin", "partner", "investor", "lender"],
  },
  {
    key: "business-partner-stats-brief",
    title: "SBF WORLD - Business Partner Platform Stats Brief - July 2 2026",
    pageId: "0deec6c131e64d79a1541ddcfe8cc7a2",
    category: "snapshot",
    roles: ["admin", "partner"],
  },
  {
    key: "founder-admin-snapshot",
    title: "SBF WORLD - Founder Admin Snapshot - July 4 2026",
    pageId: "e22321a2bc0e40b4bcb84a55a2615bda",
    category: "snapshot",
    roles: ["admin"],
  },
  {
    key: "consulting-playbook",
    title: "SBF WORLD Consulting Playbook",
    pageId: "cae9635f4e3e465db62a1315298fac09",
    category: "consulting",
    roles: ["admin", "partner", "member"],
  },
  {
    key: "consulting-command-center",
    title: "Consulting Command Center (Internal Only)",
    pageId: "2acea07d21fb4dee9b5b64fda7936376",
    category: "consulting",
    roles: ["admin"],
  },
  {
    key: "consulting-guidance-engine",
    title: "CONSULTING PILLAR - SBF WORLD Guidance Engine",
    pageId: "7c4c02b1587844b9923a771f0700041a",
    category: "consulting",
    roles: ["admin", "partner", "member"],
  },
  {
    key: "sovereign-partner-command-center",
    title: "Sovereign Partner Portal - Live Institutional Command Center",
    pageId: "480e4a6fdada4b6fa4b8ef56ed8bba2f",
    category: "portal",
    roles: ["admin", "partner"],
  },
  {
    key: "brad-gaubert-partner-command-center",
    title: "Brad Gaubert - Sovereign Partner Portal - Live CORE Command Center",
    pageId: "227537b1faf54d0bbd10e18acbed1df8",
    category: "portal",
    roles: ["admin", "partner"],
  },
];

export const modulesForRole = (role: Role) =>
  BLUEPRINT_MODULES.filter((module) => module.roles.includes(role));
