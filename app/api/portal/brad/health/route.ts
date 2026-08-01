import { bradRoute } from "@/lib/api/bradPortalRoute"; import { getBradHealth } from "@/lib/bradPortal";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const revalidate = 0;
export const GET = bradRoute(getBradHealth);
