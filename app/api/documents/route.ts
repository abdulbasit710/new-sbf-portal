import { corePortalGet } from "@/lib/api/corePortalRoute";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = corePortalGet((bundle) => bundle.sections.find((section) => section.key === "documents")?.rows || []);
