import { NextResponse } from "next/server";
import { getDynamicPortalForAuthenticatedUser, getDynamicPortalForEmail, NotionConfigError, type BlueprintUser } from "@/lib/notionService";
import type { Role } from "@/lib/types";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PORTAL_TTL_MS = 60_000;
type PortalResult = Awaited<ReturnType<typeof getDynamicPortalForEmail>>;
const portalCache = new Map<string, { expiresAt: number; data: PortalResult }>();
const pendingPortals = new Map<string, Promise<PortalResult>>();

const loadPortal = (email: string, loader: () => Promise<PortalResult> = () => getDynamicPortalForEmail(email)) => {
  const cached = portalCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
  const pending = pendingPortals.get(email);
  if (pending) return pending;

  const request = loader()
    .then((data) => {
      portalCache.set(email, { data, expiresAt: Date.now() + PORTAL_TTL_MS });
      return data;
    })
    .finally(() => pendingPortals.delete(email));
  pendingPortals.set(email, request);
  return request;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; user?: Partial<BlueprintUser> };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const allowedRoles: Role[] = ["admin", "member", "investor", "partner", "lender"];
    const sessionUser = body.user?.email?.trim().toLowerCase() === email && allowedRoles.includes(body.user.role as Role)
      ? {
          id: body.user.id || body.user.contactId || email,
          name: body.user.name || email,
          email,
          role: body.user.role as Role,
          relationshipType: body.user.relationshipType || "Portal User",
          status: "active" as const,
          contactId: body.user.contactId,
          membershipTier: body.user.membershipTier,
          accessLevel: body.user.accessLevel,
          interests: body.user.interests,
          ndaStatus: body.user.ndaStatus,
          verificationStatus: body.user.verificationStatus,
          rawFields: body.user.rawFields,
          source: "notion" as const,
        }
      : null;
    const portal = await loadPortal(
      email,
      sessionUser ? () => getDynamicPortalForAuthenticatedUser(sessionUser) : undefined,
    );

    if (!portal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active Notion user was found in 02 — People, Members & Relationships — CORE for this email.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: portal },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message =
      error instanceof NotionConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to fetch the assigned Notion portal right now.";

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
