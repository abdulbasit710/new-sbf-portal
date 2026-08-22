import { corePortalGet } from "@/lib/api/corePortalRoute";
import { PortalAccessError } from "@/lib/portalAuth";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = corePortalGet((bundle) => { if (bundle.user.role !== "investor" || !/bruce/i.test(bundle.user.name)) throw new PortalAccessError("Bruce investor access is required."); return bundle; });
