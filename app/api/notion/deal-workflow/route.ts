import { NextResponse } from "next/server";
import {
  createPartnerPortalSubmission,
  getFullUnderwritingForMatch,
  getProofOfFundsApprovalForMatch,
  NotionConfigError,
  type BlueprintUser,
} from "@/lib/notionService";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const roles: Role[] = ["admin", "member", "investor", "partner", "lender"];

const authenticatedUser = (email: string, input?: Partial<BlueprintUser>): BlueprintUser | null => {
  if (!input || input.email?.trim().toLowerCase() !== email || !roles.includes(input.role as Role)) return null;
  return {
    id: input.id || input.contactId || email,
    name: input.name || email,
    email,
    role: input.role as Role,
    relationshipType: input.relationshipType || "Portal User",
    status: "active",
    contactId: input.contactId,
    membershipTier: input.membershipTier,
    accessLevel: input.accessLevel,
    interests: input.interests,
    ndaStatus: input.ndaStatus,
    verificationStatus: input.verificationStatus,
    rawFields: input.rawFields,
    source: "notion",
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      matchId?: string;
      matchTitle?: string;
      consent?: boolean;
      action?: "consent" | "status" | "loi";
      loi?: Record<string, string>;
      user?: Partial<BlueprintUser>;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const matchId = body.matchId?.trim() ?? "";
    const user = authenticatedUser(email, body.user);
    if (!email || !matchId || !user) {
      return NextResponse.json({ success: false, error: "An authenticated user and match are required." }, { status: 400 });
    }
    if (body.action === "status") {
      const status = await getProofOfFundsApprovalForMatch(user, matchId);
      return NextResponse.json({ success: true, data: status });
    }
    if (body.action === "loi") {
      const status = await getProofOfFundsApprovalForMatch(user, matchId);
      if (!status.approved) return NextResponse.json({ success: false, error: "Proof of funds must be approved before Letter of Intent." }, { status: 403 });
      const loi = await createPartnerPortalSubmission(email, {
        submissionType: "loi-request",
        fields: {
          "Request Action": "Letter of Intent",
          "Target Record ID": matchId,
          "Target Record Title": body.matchTitle || "Selected match",
          "Asset / match / item name": body.matchTitle || "Selected match",
          "Status": "LOI Submitted for Review",
          "Proof of Funds Status": status.status,
          ...(body.loi ?? {}),
        },
      }, user);
      return NextResponse.json({ success: true, data: { loi } });
    }
    if (body.consent !== true) {
      return NextResponse.json({ success: false, error: "NDA consent is required before underwriting can be revealed." }, { status: 403 });
    }

    const consentedAt = new Date().toISOString();
    const audit = await createPartnerPortalSubmission(email, {
      submissionType: "nda-consent",
      fields: {
        "Request Action": "NDA consent for full underwriting",
        "Target Record ID": matchId,
        "Target Record Title": body.matchTitle || "Selected match",
        "Asset / match / item name": body.matchTitle || "Selected match",
        "NDA status": "Consented",
        "Consent": "I agree",
        "Consent Version": "SBF-NDA-2026.1",
        "Consented At": consentedAt,
        "Submitted By": user.name,
        "Submitter Email": user.email,
        "Contact ID": user.contactId || "",
        "Status": "NDA Consented — Admin Notification",
        "Notes / special requirements": "User consented to the NDA before server-side release of match-related full underwriting.",
      },
    }, user);
    const underwriting = await getFullUnderwritingForMatch(user, matchId);
    return NextResponse.json({ success: true, data: { audit, consentedAt, underwriting } });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to complete the NDA workflow." },
      { status },
    );
  }
}
