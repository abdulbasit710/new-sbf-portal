# SBF WORLD Admin Panel Setup

This build adds a proper admin control panel for:

- crystal@sbfworld.com
- aly@sbfworld.com

Both emails are treated as Full System Access administrators.

## Login flow

1. Go to `/login`.
2. Select `admin`.
3. Enter either:
   - `crystal@sbfworld.com`
   - `aly@sbfworld.com`
4. Generate the screen access code.
5. Paste the code into Access Code.
6. The website redirects admins to `/admin`.

## Admin panel access

The admin panel is at:

```text
/admin
```

Admins can view the full CRM across shared Notion sources:

- `02 — People, Members & Relationships — CORE`
- `Partner Submissions — CORE`
- `05 — Assets — CORE`
- `08 — Matching Engine — CORE`
- `Buy Boxes — CORE`
- `Active Buy Box Signals`
- `Documents & Diligence`
- `Support Requests`

## Admin functions added

- People and portal access overview
- All partner submissions
- All assets
- All buy boxes / mandates
- All matching records
- Documents / diligence visibility
- Support requests
- Admin-only search across CRM
- 20-record pagination
- Charts and breakdowns
- Status actions:
  - Approved
  - In Review
  - Needs Docs
  - Rejected

## Important CRM rule

Admin can see everything.

Partner, member, investor, and lender portals remain scoped by:

- Email
- Contact ID
- Partner Scope
- Assigned Portal
- Owner / Contact

Do not make frontend-only hiding the security model. Backend/API filtering must remain role-aware.

## Notion sharing

Each Notion source must be shared with the connection:

```text
SBF WORLD Platform
```

If a source shows `Not shared / not found` inside admin, open that Notion database/page and share it with the connection.

## Testing

Run:

```powershell
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/login
```

