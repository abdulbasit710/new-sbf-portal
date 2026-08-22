import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "./types";

export const PORTAL_SESSION_COOKIE = "sbf-portal-session";
const MAX_AGE_SECONDS = 8 * 60 * 60;

export type PortalIdentity = { email: string; role: Role; expiresAt: number };

const secret = () => {
  const value = process.env.PORTAL_CODE_SECRET?.trim();
  if (!value) throw new Error("PORTAL_CODE_SECRET is required for secure portal sessions.");
  return value;
};

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export const createPortalSession = (email: string, role: Role) => {
  const payload = encode(JSON.stringify({ email: email.trim().toLowerCase(), role, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${sign(payload)}`;
};

export const portalSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export const readPortalSession = (request: Request): PortalIdentity | null => {
  const rawCookie = request.headers.get("cookie") || "";
  const token = rawCookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${PORTAL_SESSION_COOKIE}=`))?.slice(PORTAL_SESSION_COOKIE.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const identity = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PortalIdentity;
    if (!identity.email || !identity.role || identity.expiresAt <= Date.now()) return null;
    return identity;
  } catch {
    return null;
  }
};

export const requirePortalSession = (request: Request) => {
  const identity = readPortalSession(request);
  if (!identity) throw new PortalAccessError("A verified portal session is required.", 401);
  return identity;
};

export class PortalAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
    this.name = "PortalAccessError";
  }
}
