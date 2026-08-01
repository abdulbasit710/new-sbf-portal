# SBF WORLD Admin + Partner Activity / Lock Workflow

This build adds the workflow requested for Brad and the admin CRM.

## Partner portal behavior

When Brad submits an asset, buy box, document, support request, matching request, underwriting request, or CORE review request:

1. The form writes the submission into `Partner Submissions — CORE` when that data source is available.
2. Uploaded documents are attached to the Notion submission row/page when a compatible Files & media property is present.
3. The portal immediately re-fetches live SBF WORLD data after submission.
4. The partner dashboard count cards, submission board, card decks, and status center update after refresh.

Brad should only see rows scoped to Brad by email, Contact ID, partner name, assigned portal, or partner visibility. This is intentional.

## Admin behavior

Crystal and Aly have full admin access:

- `crystal@sbfworld.com`
- `aly@sbfworld.com`

The admin panel now includes:

- Command Center
- Activity Ledger
- God Blueprint OS
- People & Access
- Submissions
- Assets
- Buy Boxes
- Matching Engine
- Documents
- Support
- All CRM Records

## Activity Ledger

The Activity Ledger groups all CRM activity by person/member/partner and shows:

- total records
- submissions
- assets
- matching records
- pending reviews
- approved records
- locked records
- total visible amount

This lets admin see what every partner/member is doing in the portal.

## Admin approval / lock actions

Admin can update supported status fields to:

- Approved
- In Review
- Needs Docs
- Project Locked
- Rejected

The status update searches common Notion status fields including:

- Status
- Submission Status
- Asset Status
- Review Status
- Approval
- Portal Status
- Project Status
- Lock Status
- Admin Review Status

If a Notion database row does not have any of these properties, add a `Status` property or one of the above names.

## Required Notion database

Create or share this data source with the SBF WORLD Platform connection:

`Partner Submissions — CORE`

Recommended properties:

- Submission Name
- Submission Type
- Submitted By
- Submitted Email
- Contact ID
- Partner Name
- Assigned Portal
- Status
- Priority
- Route
- Asset / Match / Item Name
- Investor / Buyer Name
- Contact Details
- Mandate Criteria
- Budget
- Geography
- Asset Class
- NDA Status
- Proof of Funds Status
- Document Links
- Uploaded Files
- Document Count
- Notes
- Submitted At
- Last Updated
- Assigned To
- Partner Visibility
- Partner Scope

The app can auto-detect this database if shared. If auto-detect fails, set:

```env
NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID=your_data_source_id
```

## Admin source of truth

Admin dashboard uses full CRM sources. Partner portals use filtered/scoped sources. Do not change this unless you enjoy turning a CRM into a public data sprinkler.
