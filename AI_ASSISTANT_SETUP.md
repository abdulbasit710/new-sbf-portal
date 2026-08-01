# SBF WORLD AI Assistant Setup

This build includes a floating **SBF WORLD AI Concierge** on the website and portal pages.

The assistant uses the SBF WORLD logo/avatar in the chat button, header, and conversation panel.

## What it does

- Gives visitors a live assistant experience.
- Answers questions about SBF WORLD access, portals, submissions, buy boxes, matching, underwriting requests, documents, and support.
- Uses public/partner-safe SBF WORLD context from Notion when configured.
- Does not expose private CORE records, internal matching logic, investor contacts, payout notes, legal strategy, passwords, tokens, or other users' records.
- Works in fallback mode if no OpenAI key is configured.

## Required for true AI responses

Add your OpenAI API key in `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini
```

Then restart the server:

```powershell
CTRL + C
npm run dev
```

## Recommended Notion knowledge base

Create a Notion page called:

```text
SBF WORLD AI Assistant Knowledge Base
```

Add only public and visitor-safe content, such as:

- What SBF WORLD is
- Who can request access
- Partner portal overview
- Asset submission process
- Buy box / mandate process
- Document upload process
- Matching engine teaser flow
- NDA / Full Reveal explanation
- Support routing
- Contact / next steps

Do not include private CORE data, investor contact details, internal underwriting logic, payout notes, private documents, API keys, passwords, or legal strategy.

Share that page with the Notion connection:

```text
SBF WORLD Platform
```

Then paste the page ID into `.env.local`:

```env
NOTION_ASSISTANT_PUBLIC_SOURCE_PAGE_ID=your_public_assistant_page_id
```

If this value is not configured, the assistant still uses safe fallback SBF WORLD platform guidance and the public website CMS source when available.

## Files added

```text
components/assistant/SbfAiAssistant.tsx
app/api/assistant/route.ts
AI_ASSISTANT_SETUP.md
```

The widget is mounted globally from:

```text
app/layout.tsx
```

## Security rule

Do not connect this visitor assistant directly to God’s Blueprint private CORE databases unless the content is explicitly public-safe. Admin access belongs inside the admin panel, not inside a public visitor chat widget.
