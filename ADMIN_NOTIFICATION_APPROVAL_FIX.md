# SBF WORLD Admin Approval + Partner Notification Fix

This build fixes the request/approval loop that was breaking the CRM workflow.

## What changed

1. **Admin bell now shows partner requests**
   - Crystal and Aly see pending approval alerts in the top-right bell.
   - The bell reads live CRM rows and highlights:
     - full reveal requests
     - lock requests
     - new submissions
     - matching requests
     - needs-docs items
     - pending admin review

2. **Admin Command Center UI is larger and cleaner**
   - Wider page container.
   - Bigger admin hero/control tower.
   - New **Admin Approval Inbox** inside `/admin`.
   - Clear action buttons: **Approve reveal**, **Lock project**, **Needs docs**, and **Full see**.

3. **Brad request flow is connected to admin**
   - In Matching Engine, Brad can request:
     - full reveal
     - project lock
   - These save into `Partner Submissions — CORE`.
   - Admin sees them in `/admin` and in the top-right notification bell.

4. **Admin approval now updates SBF WORLD properly**
   - Status field is updated.
   - If the Notion database has fields like `Admin Decision`, `Full Reveal Status`, `Lock Status`, `Partner Notification`, or `Last Updated`, the code also updates them.
   - This makes partner notifications more reliable across different Notion table structures.

5. **Partner notification is more reliable**
   - Brad’s notification bell now reads `Partner Submissions — CORE` directly.
   - It no longer depends only on the currently loaded dashboard section.
   - Approved, locked, rejected, needs-docs, and full-reveal updates show after portal refresh / polling.

## Required Notion setup

Share this database with the Notion connection `SBF WORLD Platform`:

- `Partner Submissions — CORE`

Recommended properties:

- `Submission Name` - title
- `Submission Type` - select
- `Submitted By` - text
- `Submitted Email` - email
- `Contact ID` - text
- `Partner Name` - text
- `Assigned Portal` - text/select
- `Status` - status or select
- `Admin Decision` - status/select/text
- `Full Reveal Status` - status/select/text
- `Lock Status` - status/select/text
- `Partner Notification` - text/status/select
- `Last Updated` - date/text
- `Request Action` - select/text
- `Target Record Title` - text
- `Target Source` - text
- `Asset / Match / Item Name` - text
- `Budget` - number/text
- `Geography` - text/select
- `Asset Class` - text/select
- `Document Links` - url/text
- `Uploaded Files` - files
- `Notes` - text

## Test flow

1. Login as Brad.
2. Go to Matching Engine.
3. Open a teaser card.
4. Click `Request full reveal` or `Request lock`.
5. Login as Aly or Crystal.
6. Open `/admin`.
7. Check Admin Approval Inbox or bell notification.
8. Click `Approve reveal` or `Lock project`.
9. Login back as Brad.
10. Check the notification bell or `/submissions`.

If the request does not appear, the database is not shared with `SBF WORLD Platform`, or the row was routed to the fallback God’s Blueprint page because `Partner Submissions — CORE` was not visible to the API.
