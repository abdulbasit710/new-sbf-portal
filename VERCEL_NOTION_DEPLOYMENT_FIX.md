# SBF WORLD Vercel + Notion deployment fix

This version keeps the existing UI/UX and portal logic. The changes are deployment-only: live Notion API routes are forced to run dynamically on the Node.js runtime, cache is disabled for live CRM data, Vercel function duration is increased, and a live deployment health endpoint is included.

## Why it worked locally but not on Vercel

Local development reads `.env.local` from your computer. Vercel does **not** automatically read your local `.env.local` after you push to GitHub. You must add the same values in Vercel Project Settings → Environment Variables, then redeploy.

Also, `.env.local` must never be pushed to GitHub. This zip includes a `.gitignore` that blocks `.env`, `.env.local`, and other secret files.

## Required Vercel environment variables

Add these in Vercel:

```env
NOTION_API_KEY=your_current_notion_integration_secret
NOTION_GODS_BLUEPRINT_PAGE_ID=32a966a096c2475a92bd9c05cc38c812
PORTAL_CODE_SECRET=any_long_random_string_you_create
```

Recommended values, based on your current project:

```env
NOTION_PEOPLE_DATA_SOURCE_ID=auto
NOTION_PORTAL_USERS_DATA_SOURCE_ID=auto
NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID=auto
NOTION_SITE_CONTENT_DATA_SOURCE_ID=dbc7565105254bde8a7918aa3a562fa7
NOTION_PARTNER_INTAKE_PARENT_PAGE_ID=auto
NOTION_SUBMISSIONS_PARENT_PAGE_ID=auto
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini
```

Optional:

```env
OPENAI_API_KEY=your_openai_api_key_if_you_want_real_ai_responses
NOTION_ASSISTANT_PUBLIC_SOURCE_PAGE_ID=your_public_safe_assistant_knowledge_page_id
```

Do not add `NEXT_PUBLIC_` to the Notion token. The Notion key must stay server-side only.

## Vercel setup steps

1. Push this project folder to GitHub.
2. In Vercel, import the GitHub repository.
3. Open Vercel Project → Settings → Environment Variables.
4. Add the variables above for **Production**, **Preview**, and **Development** if you use preview deployments.
5. Redeploy the project after adding environment variables.
6. Open this URL after deployment:

```text
https://your-domain.vercel.app/api/deploy/health?email=brad@keatyrealestate.com
```

Expected result:

- `NOTION_API_KEY` shows configured.
- `NOTION_GODS_BLUEPRINT_PAGE_ID` shows configured.
- `peopleDataSourceFound` is true.
- `matchedUser` shows Brad when testing Brad's email.

If `matchedUser` is null, the Vercel app can reach Notion, but the People table is not shared with the connection or Brad's email field is not visible to the API.

## Notion pages/databases that must be shared with SBF WORLD Platform

Share these Notion sources with the integration connection named `SBF WORLD Platform`:

- God's Blueprint
- `02 — People, Members & Relationships — CORE`
- `Partner Portal — Brad`
- `05 — Assets — CORE`
- `06 — Buy Boxes & Mandates — CORE`
- `08 — Matching Engine — CORE`
- `Partner Submissions — CORE`
- Any Brad-specific child databases/pages used inside Partner Portal — Brad
- Admin command / God Blueprint child databases if admin needs full CRM access

If a database is visible to you in Notion but not shared with the connection, Vercel cannot fetch it.

## What was changed in this deployment-ready build

- No UI/UX was redesigned.
- API routes now run on Node.js runtime.
- Live CRM routes use `dynamic = "force-dynamic"`.
- Live CRM routes use `fetchCache = "force-no-store"` and `revalidate = 0`.
- API routes include `maxDuration = 60` for longer Notion calls.
- Added `vercel.json` deployment config.
- Added `/api/deploy/health` to diagnose live env/Notion issues safely.
- Added `.gitignore` so `.env.local` does not get committed.
- Repaired screen-code login for Vercel serverless by using short-lived signed codes instead of only in-memory storage.
- Added `npm run vercel:check-env` for server-side env checks.

## After deployment, test in this order

```text
/api/deploy/health?email=brad@keatyrealestate.com
/login
/dashboard
/admin
/submissions
/matching-engine
```

If `/api/deploy/health` fails, do not debug the UI yet. Fix environment variables or Notion sharing first. The UI cannot fetch data from a connection Vercel cannot access, despite humanity's continued belief in miracles.
