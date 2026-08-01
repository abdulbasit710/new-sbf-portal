import { NextResponse } from "next/server";
import {
  archiveInvestorManagerRecord,
  createInvestorManagerRecord,
  getInvestorManagerSnapshot,
  NotionConfigError,
} from "@/lib/notionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const errorResponse = (error: unknown) =>
  NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : "Investor operation failed." },
    { status: error instanceof NotionConfigError ? 400 : 502 },
  );

export async function GET(request: Request) {
  try {
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!email) return NextResponse.json({ success: false, error: "Portal email is required." }, { status: 400 });
    return NextResponse.json({ success: true, data: await getInvestorManagerSnapshot(email) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; values?: Record<string, string> };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email || !body.values) {
      return NextResponse.json({ success: false, error: "Portal email and investor fields are required." }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await createInvestorManagerRecord(email, body.values) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; rowId?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const rowId = body.rowId?.trim() ?? "";
    if (!email || !rowId) {
      return NextResponse.json({ success: false, error: "Portal email and investor record ID are required." }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await archiveInvestorManagerRecord(email, rowId) });
  } catch (error) {
    return errorResponse(error);
  }
}
