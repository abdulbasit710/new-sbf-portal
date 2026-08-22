type WalkthroughUser = { email?: string; name?: string } | null | undefined;
type WalkthroughRecord = { id?: string; title?: string; fields?: Record<string, string> } | null | undefined;

export const BRUCE_WALKTHROUGH_MATCH_IDS = new Set([
  "b8e3e50cbd6f4fc387b69a238f8f0033",
  "e0a2c9241839428d98499bff2ee8b096",
  "0b092cc9bf294921a2f2607c378dc82a",
  "62f0d5067ebd4f639744a017b0abf3e3",
]);

const compactId = (value = "") => value.replaceAll("-", "").toLowerCase();

export function isBruceWalkthroughMode(user: WalkthroughUser, match?: WalkthroughRecord) {
  if (process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE !== "true") return false;
  const identity = `${user?.name || ""} ${user?.email || ""}`.toLowerCase();
  if (!identity.includes("bruce")) return false;
  if (!match) return true;
  const id = compactId(match.id);
  const recordText = `${match.title || ""} ${Object.values(match.fields || {}).join(" ")}`.toLowerCase();
  return BRUCE_WALKTHROUGH_MATCH_IDS.has(id) || /bruce edwards|eden elevations/.test(recordText);
}
