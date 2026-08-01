import { NextResponse } from "next/server";
import { getDynamicPortalForEmail, NotionConfigError } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const portal = await getDynamicPortalForEmail(email);

    if (!portal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active Notion user was found in 02 — People, Members & Relationships — CORE for this email.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: portal,
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to fetch the assigned Notion portal right now.";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
