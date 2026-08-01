import { NextResponse } from "next/server";
import { createBradMatchRecord, NotionConfigError } from "@/lib/notionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      buyBoxId?: string;
      assetId?: string;
      score?: number;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const buyBoxId = body.buyBoxId?.trim() ?? "";
    const assetId = body.assetId?.trim() ?? "";
    if (!email || !buyBoxId || !assetId || !Number.isFinite(body.score)) {
      return NextResponse.json(
        { success: false, error: "Brad email, buy box, matched asset, and score are required." },
        { status: 400 },
      );
    }
    const data = await createBradMatchRecord(email, {
      buyBoxId,
      assetId,
      score: Number(body.score),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to save this Notion match." },
      { status: error instanceof NotionConfigError ? 400 : 502 },
    );
  }
}
