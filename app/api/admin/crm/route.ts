import { NextResponse } from "next/server";
import { getAdminCrmSnapshot, NotionConfigError } from "@/lib/notionService";


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
      return NextResponse.json(
        { success: false, error: "Admin email is required." },
        { status: 400 },
      );
    }

    const data = await getAdminCrmSnapshot(email);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 403 : 502;
    const message = error instanceof Error ? error.message : "Unable to load admin CRM.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
