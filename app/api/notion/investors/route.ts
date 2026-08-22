import { NextResponse } from "next/server";
import {
  archiveInvestorManagerRecord,
  createInvestorManagerRecord,
  getInvestorManagerSnapshot,
  NotionConfigError,
} from "@/lib/notionService";
import { getCorePortalBundle, CorePortalError } from "@/lib/corePortal";
import { PortalAccessError, requirePortalSession } from "@/lib/portalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SNAPSHOT_TTL_MS = 60_000;
const snapshotCache = new Map<string, { expiresAt: number; data: Awaited<ReturnType<typeof getInvestorManagerSnapshot>> }>();
const pendingSnapshots = new Map<string, Promise<Awaited<ReturnType<typeof getInvestorManagerSnapshot>>>>();

const loadSnapshot = (email: string) => {
  const cached = snapshotCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);

  const pending = pendingSnapshots.get(email);
  if (pending) return pending;

  const request = getInvestorManagerSnapshot(email)
    .then((data) => {
      snapshotCache.set(email, { data, expiresAt: Date.now() + SNAPSHOT_TTL_MS });
      return data;
    })
    .finally(() => pendingSnapshots.delete(email));
  pendingSnapshots.set(email, request);
  return request;
};

const errorResponse = (error: unknown) =>
  NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : "Investor operation failed." },
    { status: error instanceof NotionConfigError ? 400 : 502 },
  );

export async function GET(request: Request) {
  try {
    const identity = requirePortalSession(request);
    const bundle = await getCorePortalBundle(identity);
    const rows = bundle.sections.find((section) => section.key === "investors")?.rows || [];
    return NextResponse.json(
      { success: true, data: { sourceTitle: "04 — Investors, Buyers & Lenders — CORE", rows, fields: [], user: bundle.user } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const status = error instanceof PortalAccessError || error instanceof CorePortalError ? error.status : 502;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Investor operation failed." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; values?: Record<string, string> };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email || !body.values) {
      return NextResponse.json({ success: false, error: "Portal email and investor fields are required." }, { status: 400 });
    }
    const data = await createInvestorManagerRecord(email, body.values);
    snapshotCache.delete(email);
    return NextResponse.json({ success: true, data });
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
    const data = await archiveInvestorManagerRecord(email, rowId);
    snapshotCache.delete(email);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
