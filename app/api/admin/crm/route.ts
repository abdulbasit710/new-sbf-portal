import { NextResponse } from "next/server";
import { getCanonicalAdminCrmSnapshot, NotionConfigError } from "@/lib/notionService";
import { CoreConfigurationError, CoreUnavailableError, invalidateCoreDataCache } from "@/lib/notion/coreDataService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
    const refresh = searchParams.get("refresh") === "1";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Admin email is required." },
        { status: 400 },
      );
    }

    if (refresh) invalidateCoreDataCache();
    const data = await getCanonicalAdminCrmSnapshot(email, refresh);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 403 : error instanceof CoreConfigurationError ? 503 : 502;
    const message = error instanceof CoreUnavailableError || error instanceof CoreConfigurationError
      ? "Live CORE data unavailable"
      : error instanceof Error ? error.message : "Live CORE data unavailable";
    if (error instanceof CoreUnavailableError) console.error("Canonical CORE source fetch failed", error.failures);
    else console.error("Canonical admin CRM fetch failed", error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
