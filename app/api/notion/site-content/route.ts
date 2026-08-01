import { NextResponse } from "next/server";
import { getSiteContentItems, NotionConfigError } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function GET() {
  try {
    const items = await getSiteContentItems();

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : "Unable to load live Notion website content.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
