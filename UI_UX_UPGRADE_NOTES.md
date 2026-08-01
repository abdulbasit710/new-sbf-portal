# SBF WORLD Portal UI/UX Upgrade

This version focuses on making the partner portal and admin CRM feel like a professional operating system instead of a dark spreadsheet with expensive feelings.

## What changed

- Upgraded the global portal shell with a premium black/gold background, grid texture, glow layers, and cleaner page spacing.
- Improved the left sidebar and topbar with stronger active states, better spacing, premium shadows, and cleaner navigation hierarchy.
- Added polished card-based record decks for partner pages:
  - Command Dashboard
  - Active Matches
  - Assets & SBF Vault
  - Underwritten Assets
  - Buy Box / Mandate
  - Documents & Diligence
  - My Submissions
  - Support Requests
- Each partner record deck includes:
  - KPI summary
  - Status mix chart
  - Search field
  - 20-record pagination
  - Beautiful asset/submission cards
  - Click-to-open detail modal
- Added full record detail modal for partner-safe visible data.
- Upgraded admin panel for Crystal and Aly:
  - Premium admin command hero
  - CRM source cards
  - Card-based admin work queue
  - Admin status action buttons
  - Existing audit table kept for dense checking
- Kept the CRM rule intact:
  - Admin sees everything.
  - Partners only see records scoped to their email, Contact ID, assigned portal, or partner visibility.

## Run

```powershell
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/login
```

## Important

If any section looks empty, share the matching Notion page/database with the `SBF WORLD Platform` connection. The website can only show what the Notion API can see.
