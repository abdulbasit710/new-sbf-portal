import { NextResponse } from "next/server";
import { getCorePortalBundle, CorePortalError } from "@/lib/corePortal";
import { PortalAccessError, requirePortalSession } from "@/lib/portalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const identity = requirePortalSession(request);
    const bundle = await getCorePortalBundle(identity);
    const firstName = bundle.user.name.split(/\s+/)[0] || bundle.user.name;
    return NextResponse.json({
      success: true,
      data: {
        title: `${bundle.user.role[0].toUpperCase()}${bundle.user.role.slice(1)} Portal — ${firstName}`,
        pageId: process.env.NOTION_NEW_BUILD_ZONE_PAGE_ID || "",
        user: bundle.user,
        blocks: [],
        sections: bundle.sections,
        reviewRhythm: [],
        dashboardRules: [],
        quickActions: [],
        source: "notion",
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof PortalAccessError || error instanceof CorePortalError ? error.status : 502;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to load the live CORE portal." }, { status });
  }
}
