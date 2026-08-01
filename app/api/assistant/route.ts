import { NextRequest, NextResponse } from "next/server";
import { getPageBlocks, getSiteContentItems } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
type ChatMessage = {
  role?: "assistant" | "user";
  content?: string;
};

type VisitorContext = {
  role?: string;
  name?: string;
  email?: string;
  contactId?: string;
  accessLevel?: string;
} | null;

const MAX_CONTEXT_CHARS = 9000;
const MAX_MESSAGE_CHARS = 1400;
const MAX_HISTORY = 8;

const isConfigured = (value?: string) => {
  if (!value) return false;
  const clean = value.trim();
  if (!clean) return false;
  if (clean.startsWith("replace_with_")) return false;
  if (clean.startsWith("paste_")) return false;
  if (clean.toLowerCase() === "auto") return false;
  return true;
};

const safeString = (value: unknown, max = 800) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const blockToText = (block: Awaited<ReturnType<typeof getPageBlocks>>[number]) => {
  const anyBlock = block as any;
  const type = anyBlock.type;
  if (!type) return "";

  if (type === "child_page") return `Page: ${anyBlock.child_page?.title ?? ""}`;
  if (type === "child_database") return `Database: ${anyBlock.child_database?.title ?? ""}`;
  if (type === "table_row") {
    return (anyBlock.table_row?.cells ?? [])
      .map((cell: Array<{ plain_text?: string }>) => cell.map((item) => item.plain_text ?? "").join(""))
      .filter(Boolean)
      .join(" | ");
  }

  const container = anyBlock[type];
  const richText = container?.rich_text;
  if (Array.isArray(richText)) return richText.map((item) => item.plain_text ?? "").join("").trim();

  return "";
};

const redactPrivateContext = (text: string) => {
  const lines = text.split(/\n+/);
  const blocked = [
    "password",
    "token",
    "secret",
    "api key",
    "payout",
    "commission",
    "internal note",
    "legal strategy",
    "underwriting logic",
    "private diligence",
    "bank",
    "routing number",
    "swift",
    "wire",
    "ssn",
    "ein",
    "passport",
    "contact id",
  ];

  return lines
    .filter((line) => {
      const normalized = line.toLowerCase();
      return !blocked.some((term) => normalized.includes(term));
    })
    .join("\n")
    .slice(0, MAX_CONTEXT_CHARS);
};

async function loadAssistantContext() {
  const chunks: string[] = [];

  try {
    const siteItems = await getSiteContentItems();
    if (siteItems.length) {
      chunks.push(
        "Public website CMS content:\n" +
          siteItems
            .slice(0, 18)
            .map((item) => {
              const parts = [
                item.title,
                item.section,
                item.description,
                item.tags?.length ? `Tags: ${item.tags.join(", ")}` : "",
                item.ctaLabel ? `CTA: ${item.ctaLabel} ${item.ctaUrl ?? ""}` : "",
              ].filter(Boolean);
              return `- ${parts.join(" | ")}`;
            })
            .join("\n"),
      );
    }
  } catch {
    // The assistant can still run without the public CMS source.
  }

  const publicPageId =
    process.env.NOTION_ASSISTANT_PUBLIC_SOURCE_PAGE_ID || process.env.NOTION_ASSISTANT_SOURCE_PAGE_ID || "";

  if (isConfigured(publicPageId)) {
    try {
      const blocks = await getPageBlocks(publicPageId.trim());
      const blockText = blocks
        .map(blockToText)
        .filter(Boolean)
        .slice(0, 120)
        .join("\n");
      if (blockText) chunks.push(`Public assistant knowledge page:\n${blockText}`);
    } catch {
      // Ignore missing assistant page to avoid breaking the visitor widget.
    }
  }

  if (!chunks.length) {
    chunks.push(
      [
        "SBF WORLD OS is an institutional capital deployment platform with role-based portals for partners, members, investors, lenders, and admins.",
        "Public visitors can ask about access, portal workflow, buy boxes, asset submissions, matching, underwriting requests, documents, and support.",
        "Private CORE records, internal matching logic, investor contacts, private diligence, payout notes, and other users' information must never be shared.",
      ].join("\n"),
    );
  }

  return redactPrivateContext(chunks.join("\n\n"));
}

const fallbackAnswer = (message: string) => {
  const lower = message.toLowerCase();

  if (lower.includes("access") || lower.includes("login") || lower.includes("portal")) {
    return "SBF WORLD uses role-based portal access. Visitors request access, approved users are verified against the SBF WORLD identity layer, then routed to the correct portal: partner, member, investor, lender, or admin. Admins can see the whole CRM; ordinary users only see their own scoped records.";
  }

  if (lower.includes("submit") || lower.includes("asset") || lower.includes("buy box") || lower.includes("mandate")) {
    return "A partner can submit assets, buy boxes, documents, updates, support requests, matching requests, and underwriting requests through the portal. Each submission should stay attributed to the partner and route into the SBF WORLD CORE workflow for review.";
  }

  if (lower.includes("match") || lower.includes("matching")) {
    return "The matching flow should show only partner-safe teaser information first. Full reveal, investor details, private diligence, and internal matching logic stay hidden unless the proper NDA and approval gates are cleared.";
  }

  return "I can help with SBF WORLD access, partner submissions, buy boxes, documents, matching, underwriting requests, and portal workflow. The full AI model key is not configured yet, so this is the safe fallback assistant. Functional, just not as glamorous as everyone wanted.";
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
      history?: ChatMessage[];
      pagePath?: string;
      visitor?: VisitorContext;
    };

    const message = safeString(body.message, MAX_MESSAGE_CHARS);
    if (!message) {
      return NextResponse.json({ success: false, error: "Message is required." }, { status: 400 });
    }

    const context = await loadAssistantContext();
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-MAX_HISTORY)
          .map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: safeString(item.content, 700) }))
          .filter((item) => item.content)
      : [];

    const openAiKey = process.env.OPENAI_API_KEY?.trim();
    if (!isConfigured(openAiKey)) {
      return NextResponse.json({ success: true, answer: fallbackAnswer(message), mode: "fallback" });
    }

    const visitor = body.visitor;
    const visitorLine = visitor
      ? `Logged-in viewer: ${visitor.name || "Unknown"}, role ${visitor.role || "unknown"}, access ${visitor.accessLevel || "unknown"}. Do not reveal private CRM records unless the page itself already displays them to this user.`
      : "Viewer is a public website visitor. Use only public/platform-safe information.";

    const instructions = [
      "You are the SBF WORLD live website assistant using the SBF WORLD logo/avatar.",
      "Answer clearly, briefly, and professionally for website visitors and approved portal users.",
      "Use only the provided SBF WORLD context and general platform explanation.",
      "Never expose internal CORE matching logic, private diligence, payout notes, legal strategy, tokens, passwords, private contacts, or records belonging to other users.",
      "If asked for private admin data, tell the user to contact the SBF WORLD team or use the admin portal if authorized.",
      "If the context is insufficient, say what can be done next instead of inventing details.",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || "gpt-4.1-mini",
        store: false,
        max_output_tokens: 520,
        input: [
          {
            role: "system",
            content: `${instructions}\n\n${visitorLine}\n\nCurrent page: ${safeString(body.pagePath, 120) || "/"}\n\nSBF WORLD context:\n${context}`,
          },
          ...history.map((item) => ({ role: item.role, content: item.content })),
          { role: "user", content: message },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "AI assistant provider rejected the request.";
      return NextResponse.json(
        { success: true, answer: `${fallbackAnswer(message)}\n\nAI provider note: ${errorMessage}`, mode: "fallback" },
        { status: 200 },
      );
    }

    const answer =
      typeof payload.output_text === "string"
        ? payload.output_text.trim()
        : Array.isArray(payload.output)
          ? payload.output
              .flatMap((item: any) => item.content ?? [])
              .map((part: any) => part.text ?? "")
              .join(" ")
              .trim()
          : "";

    return NextResponse.json({ success: true, answer: answer || fallbackAnswer(message), mode: "ai" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
