import { NextResponse } from "next/server";
import { getPortalNotificationsForEmail, NotionConfigError } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const items = await getPortalNotificationsForEmail(email);

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: items.length,
        items,
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message = error instanceof Error ? error.message : "Unable to load SBF WORLD notifications.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
