import { NextResponse } from "next/server";
import { authenticateBlueprintUser, NotionConfigError } from "@/lib/notionService";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const ROLES: Role[] = ["admin", "member", "investor", "partner", "lender"];

const isRole = (value: unknown): value is Role =>
  typeof value === "string" && ROLES.includes(value as Role);


export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: Role;
    };

    if (!body.email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const user = await authenticateBlueprintUser(
      body.email,
      body.password,
      isRole(body.role) ? body.role : undefined,
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No approved Notion portal user matched those credentials." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        email: user.email,
        name: user.name,
        relationshipType: user.relationshipType,
        source: user.source,
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : "Unable to authenticate through Notion right now.";

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
