import { NextResponse } from "next/server";
import { roleRedirect, verifyOtp } from "@/lib/otpStore";
import { findApprovedPortalUser, NotionConfigError } from "@/lib/notionService";
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
      role?: Role;
      code?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const role = isRole(body.role) ? body.role : "member";
    const code = body.code?.trim() ?? "";

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and code are required." },
        { status: 400 },
      );
    }

    const result = verifyOtp(email, role, code);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 },
      );
    }

    const user = "user" in result ? result.user : await findApprovedPortalUser(email, role);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "The access code was valid, but the live Notion user could not be reloaded. Check People CORE sharing and Vercel environment variables.",
        },
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
        contactId: user.contactId,
        membershipTier: user.membershipTier,
        accessLevel: user.accessLevel,
        interests: user.interests,
        ndaStatus: user.ndaStatus,
        verificationStatus: user.verificationStatus,
        source: user.source,
        redirectPath: roleRedirect(user.role),
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message = error instanceof Error ? error.message : "Unable to verify the access code.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
