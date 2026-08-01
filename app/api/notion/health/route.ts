import { NextResponse } from "next/server";
import { getNotionPortalDiagnostics } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;

  try {
    const diagnostics = await getNotionPortalDiagnostics(email);

    return NextResponse.json({
      success: diagnostics.errors.length === 0,
      data: {
        tokenConfigured: diagnostics.tokenConfigured,
        blueprintPageConfigured: diagnostics.blueprintPageConfigured,
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Notion health check failed.",
      },
      { status: 500 },
    );
  }
}
