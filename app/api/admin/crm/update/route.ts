import { NextResponse } from "next/server";
import { NotionConfigError, updateAdminCrmRowStatus } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminEmail?: string;
      rowId?: string;
      status?: string;
    };

    const adminEmail = body.adminEmail?.trim().toLowerCase() ?? "";
    const rowId = body.rowId?.trim() ?? "";
    const status = body.status?.trim() ?? "";

    if (!adminEmail || !rowId || !status) {
      return NextResponse.json(
        { success: false, error: "Admin email, row ID, and status are required." },
        { status: 400 },
      );
    }

    const data = await updateAdminCrmRowStatus(adminEmail, rowId, status);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message = error instanceof Error ? error.message : "Unable to update this CRM row.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
