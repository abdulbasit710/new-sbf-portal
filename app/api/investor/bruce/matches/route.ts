import { NextResponse } from "next/server";
import { getBruceVisibleMatches, getInvestorPofStatus } from "@/lib/bruceVisibleMatches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string };
    const email = body.email || "bruce@edenelevations3.com";
    const [data, pof] = await Promise.all([getBruceVisibleMatches(email), getInvestorPofStatus(email)]);
    return NextResponse.json({ success: true, data: { ...data, ...pof, debug: process.env.NODE_ENV === "development" ? data.debug : undefined } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to load Bruce-visible matches." }, { status: 502 });
  }
}
