import { NextResponse } from "next/server";
import { findApprovedPortalUser, NotionConfigError } from "@/lib/notionService";
import { createOtp } from "@/lib/otpStore";
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
    const body = (await request.json()) as { email?: string; role?: Role };
    const email = body.email?.trim().toLowerCase() ?? "";
    const role = isRole(body.role) ? body.role : undefined;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const user = await findApprovedPortalUser(email, role);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active Notion user matched this email and selected access profile in 02 — People, Members & Relationships — CORE.",
        },
        { status: 404 },
      );
    }

    const otp = createOtp(user);

    return NextResponse.json({
      success: true,
      data: {
        delivery: "screen",
        message: `Notion verified ${user.name}. Copy the access code below and paste it to open the ${user.role} portal.`,
        devCode: otp.code,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to generate a portal access code right now.";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
