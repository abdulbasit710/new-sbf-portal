# SBF WORLD Notion Portal Setup

This build uses Notion as the live source for partner portals.

## Login source

The login checks this Notion data source first:

`02 — People, Members & Relationships — CORE`

The row must include the user's email and an active status. The code reads flexible field names like `Email`, `Contact Email`, `Primary Email`, `Status`, `Relationship Type`, `Access Level`, `Contact ID`, `Interests`, `NDA Status`, and `Verification Status`.

## Brad portal source

After login, the website searches for the assigned portal page. For Brad, share:

`Partner Portal — Brad`

with the Notion connection:

`SBF WORLD Platform`

Also share child pages/databases and any referenced data sources you want visible in the portal, especially:

- `05 — Assets — CORE`
- `08 — Matching Engine — CORE`
- `📡 Active Buy Box Signals — Brad`
- `Brad-Scoped Buy Boxes & Matches Only`
- any document/diligence pages cleared for Brad visibility

## Visibility rules

The dashboard filters rows before display. It keeps Brad-scoped rows and hides fields that look internal, private, sensitive, payout-related, legal-strategy-related, underwriting-logic-related, password/token-related, or other-partner contact details unless explicitly approved.

To make rows visible, include Brad-identifying values such as:

- `Brad`
- `Brad Gaubert`
- Brad's email
- Brad's Contact ID
- a partner/owner/originator/submitted-by field connected to Brad

For contact details or full reveal information, use approval fields such as:

- `Contact Approved`
- `Contact Visible`
- `Intro Approved`
- `Full Reveal Approved`
- `Founder Approved`

## Partner submissions

The portal includes a Universal Partner Intake form for:

- new assets
- buy boxes / mandates
- document links
- support requests
- matching requests
- underwriting requests
- CORE review flags
- JV logic confirmation
- full reveal requests
- intro / next step requests

Submissions are created as child pages under:

`NOTION_PARTNER_INTAKE_PARENT_PAGE_ID`

If that is not set, they route to:

`NOTION_SUBMISSIONS_PARENT_PAGE_ID`

If that is not set either, they default to:

`NOTION_GODS_BLUEPRINT_PAGE_ID`

Make sure the connection has insert-content permission.

## Local commands

```powershell
npm install
npm run dev
```

Then open:

`http://localhost:3000/login`

## Security note

This is a Notion-backed prototype. Before production, rotate the Notion token and move authentication/session storage to secure server-side cookies.

## Partner Submissions — CORE CRM pipeline

This updated build adds a proper submission/status pipeline.

Create and share a Notion data source named:

```text
Partner Submissions — CORE
```

The app will auto-find it if this line is set:

```env
NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID=auto
```

When Brad submits assets, buy boxes, documents, support, matching, underwriting, reveal, intro, CORE review, or JV logic requests, the app creates a CRM row there. The left navigation now includes **My Submissions** so Brad can see his own submitted items, status, route, next action, and updates.

If the data source is missing or not shared with **SBF WORLD Platform**, the app falls back to creating a child page under God’s Blueprint CORE. That fallback prevents lost submissions, but the recommended setup is the CRM database.

See `PARTNER_SUBMISSIONS_CORE_SETUP.md` for the exact Notion properties.
