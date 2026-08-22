import { NextResponse } from "next/server";
import { CorePortalError, getCorePortalBundle } from "@/lib/corePortal";
import { PortalAccessError, requirePortalSession } from "@/lib/portalAuth";

export const corePortalGet = (selector: (bundle: Awaited<ReturnType<typeof getCorePortalBundle>>, request: Request) => unknown) => async (request: Request) => {
  try {
    const identity = requirePortalSession(request);
    const bundle = await getCorePortalBundle(identity);
    return NextResponse.json({ success: true, data: await selector(bundle, request) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof PortalAccessError || error instanceof CorePortalError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Unable to load live CORE portal data.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
};
