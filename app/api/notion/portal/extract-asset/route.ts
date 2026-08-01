import { NextResponse } from "next/server";
import { extractAssetDocument } from "@/lib/assetDocumentExtraction";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const file = (await request.formData()).get("document");
    if (!(file instanceof File) || !file.size) return NextResponse.json({ success: false, error: "Choose an asset document first." }, { status: 400 });
    return NextResponse.json({ success: true, data: await extractAssetDocument(file) });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to read this asset document." }, { status: 502 }); }
}
