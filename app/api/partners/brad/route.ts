import { corePortalGet } from "@/lib/api/corePortalRoute";
import { PortalAccessError } from "@/lib/portalAuth";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = corePortalGet((bundle) => { if (bundle.user.role !== "partner" || !/brad/i.test(bundle.user.name)) throw new PortalAccessError("Brad partner access is required."); return bundle; });
