import { NextResponse } from "next/server";
import { getAllBlueprintPages, getBlueprintPagesForRole, NotionConfigError } from "@/lib/notionService";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const ROLES: Role[] = ["admin", "member", "investor", "partner", "lender"];

const isRole = (value: string | null): value is Role =>
  Boolean(value && ROLES.includes(value as Role));


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  try {
    const pages = isRole(role)
      ? await getBlueprintPagesForRole(role)
      : await getAllBlueprintPages();

    return NextResponse.json({
      success: true,
      data: {
        role: isRole(role) ? role : "all",
        pages,
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : "Unable to load God's Blueprint data from Notion.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
