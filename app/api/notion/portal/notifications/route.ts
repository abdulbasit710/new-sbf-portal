import { NextResponse } from "next/server";
import { getPortalNotificationsForEmail, NotionConfigError } from "@/lib/notionService";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOTIFICATION_TTL_MS = 120_000;
type NotificationItems = Awaited<ReturnType<typeof getPortalNotificationsForEmail>>;
const notificationCache = new Map<string, { expiresAt: number; items: NotificationItems }>();
const pendingNotifications = new Map<string, Promise<NotificationItems>>();

const loadNotifications = (email: string) => {
  const cached = notificationCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.items);
  const pending = pendingNotifications.get(email);
  if (pending) return pending;

  const request = getPortalNotificationsForEmail(email)
    .then((items) => {
      notificationCache.set(email, { items, expiresAt: Date.now() + NOTIFICATION_TTL_MS });
      return items;
    })
    .finally(() => pendingNotifications.delete(email));
  pendingNotifications.set(email, request);
  return request;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const items = await loadNotifications(email);

    return NextResponse.json(
      { success: true, data: { unreadCount: items.length, items } },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } },
    );
  } catch (error) {
    const status = error instanceof NotionConfigError ? 400 : 502;
    const message = error instanceof Error ? error.message : "Unable to load SBF WORLD notifications.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
