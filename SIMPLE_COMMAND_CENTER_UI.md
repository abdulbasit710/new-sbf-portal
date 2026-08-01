# Simple Command Center UI Update

This version simplifies the partner command dashboard based on the supplied sketch.

## What changed

- The main command dashboard now shows three large cards:
  - **My Assets**
  - **My Buy Boxes**
  - **My Matches**
- Each card shows only two primary numbers:
  - record count
  - visible value
- A simple totals table underneath repeats the sketch concept:
  - section name
  - record count
  - visible value
- Detailed charts/tables are still available inside each left-sidebar page, but they are no longer dumped on the main command dashboard.
- The dashboard now has quick action buttons for:
  - Submit anything
  - Run matching engine
  - Check submission status
  - Partner identity

## Data logic

The numbers are still live from SBF WORLD / Notion and remain partner-scoped.

- My Assets = rows from the assets/SBF Vault view
- My Buy Boxes = rows from the buy-box/mandate view
- My Matches = rows from the active matches/matching view
- My Submissions = rows from Partner Submissions — CORE
- Total visible portal = unique rows across those groups

Admin still sees all CRM data in admin. Partner portals stay scoped.
