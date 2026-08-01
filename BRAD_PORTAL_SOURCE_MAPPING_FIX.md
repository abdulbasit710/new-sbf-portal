# Brad Portal Source Mapping Fix

This build keeps the current UI/UX but fixes the live SBF WORLD / Notion source mapping for Brad's command center.

## Command Center boxes

The dashboard now shows five simple live boxes:

1. **My Assets**
   - Source: `05 — Assets — CORE`
   - Scoped by Brad / Brad Gaubert / email / Contact ID / Owner Partner / Assigned Partner / Partner Scope.

2. **My Buy Boxes**
   - Source: `06 — Buy Boxes & Mandates — CORE`
   - Also searches aliases like `Brad — CORE Buy Boxes`.
   - This fixes the issue where the Buy Box box showed zero while the Notion Brad buy-box view had rows.

3. **My Investors**
   - Source: `04 — Investors, Buyers & Lenders — CORE`
   - Intended for the Notion view/table showing Brad investor activity.
   - Rows must contain a Brad-scoping field somewhere in the row, such as Owner Partner, Assigned Partner, Partner Scope, Contact ID, Brad's name, or Brad's email.

4. **My Underwriting**
   - Source: `07 — Underwriting Engine — CORE`
   - Also reads approved underwriting fields from the Brad-scoped asset/underwriting sources.

5. **My Matches**
   - Source: `08 — Matching Engine — CORE`
   - Matching Engine also includes underwriting rows as candidate sources for teaser cards.

## Important Notion rule

Notion API cannot read a filtered database view as a separate source unless the row data itself includes fields to scope the records. So every Brad row should include at least one of these fields/values:

- `Owner Partner = Brad Gaubert`
- `Assigned Partner = Brad Gaubert`
- `Partner Scope = Brad Gaubert`
- `Assigned Portal = Partner Portal — Brad`
- `Contact ID = Brad's Contact ID`
- `Email = brad@keatyrealestate.com`

Admin can see all records. Partner portal pages remain scoped.

## Notion pages/databases to share with SBF WORLD Platform

- `02 — People, Members & Relationships — CORE`
- `04 — Investors, Buyers & Lenders — CORE`
- `05 — Assets — CORE`
- `06 — Buy Boxes & Mandates — CORE`
- `07 — Underwriting Engine — CORE`
- `08 — Matching Engine — CORE`
- `12 — Partner Submissions — CORE`
- `Partner Portal — Brad`

If any box is empty on Vercel, first check that the exact database is shared with the Notion integration and that the needed environment variables are added in Vercel.
