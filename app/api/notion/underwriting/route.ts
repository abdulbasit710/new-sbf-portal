import { NextResponse } from "next/server";
import { createPartnerUnderwritingRecord, NotionConfigError } from "@/lib/notionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; assetId?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const assetId = body.assetId?.trim() || "";
    if (!email || !assetId) return NextResponse.json({ success: false, error: "Portal email and asset are required." }, { status: 400 });
    return NextResponse.json({ success: true, data: await createPartnerUnderwritingRecord(email, assetId) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to create underwriting." }, { status: error instanceof NotionConfigError ? 400 : 502 });
  }
}
