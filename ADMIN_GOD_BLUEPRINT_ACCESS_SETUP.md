# SBF WORLD Admin Panel — God’s Blueprint Full Access

This build upgrades the admin dashboard so Crystal and Aly can open the full God’s Blueprint operating system from the admin panel.

## Admin emails

Only these emails have full admin access:

- crystal@sbfworld.com
- aly@sbfworld.com
- aly.fredricks12@gmail.com

They must exist in `02 — People, Members & Relationships — CORE` or be permitted by the app fallback admin allowlist.

## Main admin source

The admin panel reads the main root page set in `.env.local`:

```env
NOTION_GODS_BLUEPRINT_PAGE_ID=your_gods_blueprint_root_page_id
```

The dashboard now loads:

- God’s Blueprint root page
- child pages under God’s Blueprint
- child data sources/databases under God’s Blueprint
- visible page blocks
- visible database rows where the SBF WORLD Platform connection has access

## Required Notion sharing

In Notion, share the root page and every child CORE/portal page/database with:

```text
SBF WORLD Platform
```

Especially:

- 01 — Universal Intake — CORE
- 02 — People, Members & Relationships — CORE
- 03 — Partner Registry — CORE
- 04 — Investors, Buyers & Lenders — CORE
- 05 — Assets — CORE
- 06 — Buy Boxes & Mandates — CORE
- 07 — Underwriting Engine — CORE
- 08 — Matching Engine — CORE
- 09 — Vault & Controlled Reveal — CORE
- 10 — Deals, LOI, PSA & Closing — CORE
- 11 — Documents & Governance — CORE
- 12 — Events & Member Access — CORE
- 13 — Payments, Revenue & Payouts — CORE
- 14 — Cigar Products, Inventory & Orders — CORE
- 15 — Pillar HQ Registry — CORE
- Founder / Admin Command Portal
- Partner Portal — Master Template
- Investor / Buyer Portal — Master Template
- Lender Portal — Master Template
- Brad Gaubert — Sovereign Partner Portal — Live CORE Command Center

## What admin can see

The new Admin Panel has a `God Blueprint OS` section. It shows:

- every visible Blueprint module
- page count
- data source count
- visible records
- visible blocks
- category map chart
- visible row volume chart
- module cards
- module detail modal
- direct Open in Notion button
- visible properties, content preview, and database rows

## Security rule

Admin can see all records.
Partners, members, investors, and lenders stay scoped by:

- Contact ID
- email
- assigned portal
- partner scope
- portal visibility

Never expose unrestricted CORE records to a partner portal.
