import { NextResponse } from "next/server";
import { NotionConfigError } from "@/lib/notionService";
import { getApprovedCoreUser, getCoreUserAccessStatus, CorePortalError } from "@/lib/corePortal";
import { createOtp } from "@/lib/otpStore";
// Email delivery is temporarily disabled while the portal is being revised.
// import { hasMailConfig, sendMail } from "@/lib/serverEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; role?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const user = await getApprovedCoreUser(email);

    if (!user) {
      const accessStatus = await getCoreUserAccessStatus(email);
      return NextResponse.json(
        {
          success: false,
          error: accessStatus.message,
        },
        { status: 404 },
      );
    }

    const otp = createOtp(user);
    // TODO: Re-enable sendMail(...) when email OTP is ready for production.

    return NextResponse.json({
      success: true,
      data: {
        delivery: "screen",
        message: `Notion verified ${user.name}. Copy the code below to open the ${user.role} portal.`,
        devCode: otp.code,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    const status = error instanceof CorePortalError ? error.status : error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to generate a portal access code right now.";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
