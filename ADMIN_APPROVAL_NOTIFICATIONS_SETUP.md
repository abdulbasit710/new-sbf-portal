# SBF WORLD Admin Approval + Partner Notifications

This build adds the approval loop the portal needed:

1. A partner submits an asset, buy box, document, matching request, full reveal request, or project lock request from the portal.
2. The request writes into `Partner Submissions — CORE` where possible.
3. Admin users `crystal@sbfworld.com` and `aly@sbfworld.com` can see the request in `/admin`.
4. Admin can mark the record as:
   - Approved
   - Full Reveal Approved
   - In Review
   - Needs Docs
   - Project Locked
   - Rejected
5. The partner notification bell reads those SBF WORLD statuses and shows updates in the top bar.
6. Partner portals remain scoped by email, Contact ID, partner scope, and assigned portal. Admin sees all CRM records.

## Required Notion database

Create/share this database with the `SBF WORLD Platform` connection:

`Partner Submissions — CORE`

Recommended properties:

- Submission Name, Title
- Submission Type, Select or Status
- Submitted By, Text
- Submitted Email, Email
- Contact ID, Text
- Partner Name, Text
- Assigned Portal, Text
- Status, Status
- Priority, Select
- Route, Select or Text
- Asset / Match / Item Name, Text
- Target Record ID, Text
- Target Record Title, Text
- Target Source, Text
- Request Action, Select or Text
- Investor / Buyer Name, Text
- Contact Details, Text
- Mandate Criteria, Text
- Budget, Number or Text
- Geography, Text
- Asset Class, Select or Text
- NDA Status, Select or Text
- Proof of Funds Status, Select or Text
- Uploaded Files, Files & media
- Notes, Text
- Submitted At, Date
- Last Updated, Date
- Assigned To, Text
- Partner Visibility, Select
- Partner Scope, Text
- Admin Decision, Select or Text

## How full reveal works

Inside the Matching Engine teaser modal, the partner can click:

- Request full reveal
- Request lock

Both become admin-review rows in `Partner Submissions — CORE`.

Admin opens `/admin`, reviews the record, and chooses `Full Reveal Approved` or `Project Locked`.

The partner notification bell then shows the update. If an underlying asset row itself has `Full Reveal Status = Approved` or a similar approved/cleared field, the teaser modal expands into the full partner-visible record.

## Important safety rule

Do not put private internal logic, payout notes, legal strategy, tokens, or protected diligence in partner-visible fields. The UI hides obvious internal fields, but Notion data hygiene still matters. Shocking, yes, but the database cannot read minds.
