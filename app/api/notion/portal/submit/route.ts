import { NextResponse } from "next/server";
import {
  createPartnerPortalSubmission,
  createBruceMatchRequest,
  NotionConfigError,
  uploadPartnerFileToNotion,
  type PartnerPortalSubmissionInput,
} from "@/lib/notionService";
import { createCorePortalRecord } from "@/lib/bradPortal";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const allowedSubmissionTypes = new Set([
  "new-asset",
  "buy-box",
  "documents",
  "support",
  "matching",
  "underwriting",
  "update",
  "full-reveal",
  "lock-request",
  "intro-next-step",
  "core-review",
  "jv-logic",
]);

const parseJsonFields = (value: FormDataEntryValue | null): Record<string, string> => {
  if (typeof value !== "string" || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [key, String(item ?? "")]),
    );
  } catch {
    return {};
  }
};

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const submissionType = String(form.get("submissionType") ?? "support").trim();
    const fields = parseJsonFields(form.get("fields"));
    const files = form
      .getAll("documents")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    return { email, submissionType, fields, files };
  }

  const body = (await request.json()) as {
    email?: string;
    submissionType?: string;
    fields?: Record<string, string>;
  };

  return {
    email: body.email?.trim().toLowerCase() ?? "",
    submissionType: body.submissionType?.trim() ?? "support",
    fields: body.fields ?? {},
    files: [] as File[],
  };
}

export async function POST(request: Request) {
  try {
    const { email, submissionType, fields, files } = await parseRequest(request);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    if (!allowedSubmissionTypes.has(submissionType)) {
      return NextResponse.json(
        { success: false, error: "Unsupported submission type." },
        { status: 400 },
      );
    }

    const uploadedFiles = files.length
      ? await Promise.all(files.map((file) => uploadPartnerFileToNotion(file)))
      : [];

    const input: PartnerPortalSubmissionInput = {
      submissionType,
      fields,
      uploadedFiles,
    };

    if (submissionType === "matching" && fields.Request === "Add to My Matches") {
      const result = await createBruceMatchRequest(email, {
        buyBoxId: fields["Buy Box ID"] ?? "",
        assetId: fields["Asset ID"] ?? "",
        assetName: fields.Asset ?? "Requested investor match",
        buyBoxName: fields["Buy Box"] ?? "Selected mandate",
        market: fields.Market,
        assetType: fields["Asset Type"],
        price: fields.Price,
        score: fields["Match Score"],
        sourcePartner: fields["Source Partner Lane"],
        approvalStatus: "Submitted for Review",
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (submissionType === "new-asset" || submissionType === "buy-box") {
      const coreRecord = await createCorePortalRecord(email, submissionType, fields);
      // Preserve the general submissions ledger and uploaded documents for audit,
      // but never hide a successfully created dedicated CORE record if that
      // secondary audit write is unavailable.
      const audit = await createPartnerPortalSubmission(email, input).catch((auditError) => {
        console.error("[Portal submission] CORE record created, audit ledger write failed.", auditError);
        return null;
      });
      return NextResponse.json({
        success: true,
        data: {
          ...coreRecord,
          auditId: audit?.id,
          auditRoute: audit?.route,
          uploadedFiles: uploadedFiles.map((file) => ({ name: file.name, size: file.size, contentType: file.contentType })),
        },
      });
    }

    const result = await createPartnerPortalSubmission(email, input);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        uploadedFiles: uploadedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          contentType: file.contentType,
        })),
      },
    });
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to route this submission into Notion right now.";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
