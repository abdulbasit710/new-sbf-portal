import { NextResponse } from "next/server";
import { getGoldEmblem, NotionConfigError } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function GET() {
  try {
    const emblem = await getGoldEmblem();

    if (!emblem) {
      return NextResponse.json(
        {
          success: false,
          error: "SBF WORLD Official Gold Emblem was not found in Notion.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: emblem,
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : "Unable to load SBF WORLD Official Gold Emblem from Notion.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
