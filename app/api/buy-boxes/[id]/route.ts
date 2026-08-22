import { findBundleRecord } from "@/lib/corePortal"; import { corePortalGet } from "@/lib/api/corePortalRoute";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = corePortalGet((bundle, request) => findBundleRecord(bundle, new URL(request.url).pathname.split("/").pop() || "", ["buy-box-signals"]));
