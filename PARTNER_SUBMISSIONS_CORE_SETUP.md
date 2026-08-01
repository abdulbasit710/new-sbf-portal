# Partner Submissions — CORE Setup

This build routes partner submissions into a proper CRM-style Notion data source when available.

## 1. Create the Notion database

Create a Notion database/data source named:

```text
Partner Submissions — CORE
```

Share it with the Notion connection:

```text
SBF WORLD Platform
```

## 2. Recommended properties

Create these properties. Exact spelling is recommended, but the code has fuzzy mapping for common variants.

| Property | Type |
|---|---|
| Submission Name | Title |
| Submission Type | Select |
| Submitted By | Text |
| Submitted Email | Email |
| Contact ID | Text |
| Partner Name | Text |
| Assigned Portal | Text or Select |
| Status | Status or Select |
| Priority | Select |
| Route | Select or Text |
| Asset / Match / Item Name | Text |
| Investor / Buyer Name | Text |
| Contact Details | Text |
| Mandate Criteria | Text |
| Budget | Text |
| Geography | Text or Select |
| Asset Class | Text or Select |
| NDA Status | Select |
| Proof of Funds Status | Select |
| Document Links | URL or Text |
| Uploaded Files | Files & media |
| Document Count | Number |
| Notes | Text |
| Submitted At | Date |
| Last Updated | Date |
| Assigned To | Text |
| Partner Visibility | Select |
| Partner Scope | Text |

## 3. Recommended status options

Use these in the `Status` property:

```text
New
Received
In Review
Needs Docs
Routed to CORE
Matched
Underwriting Review
Full Reveal Requested
Approved
Rejected
Completed
```

## 4. Document upload behavior

The Brad portal asset/intake form now supports file uploads. When Brad attaches files and submits, the website uses the Notion File Upload API to upload each file to Notion-managed storage and attaches those files to the created submission row/page. Keep each file at or under 20MB for the direct upload flow.

Recommended upload examples:

```text
Asset teaser PDF
NDA / signed NDA
Proof-of-funds document
Ownership or seller documents
Underwriting PDF
Diligence pack / photos / deck
```

If the `Uploaded Files` property exists and is a Files & media property, the files attach there. The files are also added as file blocks inside the Notion submission page so the SBF WORLD team can open them from the row.

## 5. What happens when Brad submits

The website checks the logged-in user from:

```text
02 — People, Members & Relationships — CORE
```

Then it creates a row in:

```text
Partner Submissions — CORE
```

The row is attributed with:

```text
Submitted Email
Contact ID
Partner Name
Partner Scope
Assigned Portal
```

Brad's portal only displays rows linked to Brad's email, Contact ID, name, or assigned scope. Admin can review all rows from Notion.

## 6. Fallback behavior

If `Partner Submissions — CORE` is not shared or cannot be found, the website falls back to creating a child page under God’s Blueprint CORE. That keeps submissions from disappearing, but proper CRM status tracking needs the database above.
