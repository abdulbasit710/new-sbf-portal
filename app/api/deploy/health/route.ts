import { NextResponse } from "next/server";
import { getNotionPortalDiagnostics } from "@/lib/notionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const envStatus = (key: string) => {
  const value = process.env[key]?.trim() ?? "";
  const configured = Boolean(value) && !value.startsWith("replace_with_") && !value.toLowerCase().startsWith("paste_");
  return {
    key,
    configured,
    mode: configured && value.toLowerCase() === "auto" ? "auto" : configured ? "set" : "missing",
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || undefined;

  try {
    const diagnostics = await getNotionPortalDiagnostics(email);

    return NextResponse.json(
      {
        success: diagnostics.errors.length === 0,
        environment: {
          vercel: Boolean(process.env.VERCEL),
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          vercelEnv: process.env.VERCEL_ENV ?? "local",
        },
        env: [
          envStatus("NOTION_API_KEY"),
          envStatus("NOTION_GODS_BLUEPRINT_PAGE_ID"),
          envStatus("NOTION_PEOPLE_DATA_SOURCE_ID"),
          envStatus("NOTION_PARTNER_SUBMISSIONS_DATA_SOURCE_ID"),
          envStatus("NOTION_SUBMISSIONS_DATABASE_ID"),
          envStatus("NOTION_SITE_CONTENT_DATA_SOURCE_ID"),
          envStatus("OPENAI_API_KEY"),
        ],
        notion: {
          peopleDataSourceFound: Boolean(diagnostics.peopleDataSourceId),
          portalUsersDataSourceFound: Boolean(diagnostics.portalUsersDataSourceId),
          peopleCount: diagnostics.peopleCount,
          portalUsersCount: diagnostics.portalUsersCount,
          matchedUser: diagnostics.matchedUser
            ? {
                name: diagnostics.matchedUser.name,
                email: diagnostics.matchedUser.email,
                role: diagnostics.matchedUser.role,
                status: diagnostics.matchedUser.status,
                contactId: diagnostics.matchedUser.contactId,
                accessLevel: diagnostics.matchedUser.accessLevel,
              }
            : null,
          errors: diagnostics.errors,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Deployment health check failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
