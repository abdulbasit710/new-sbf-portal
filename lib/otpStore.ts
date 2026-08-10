import { createHmac } from "node:crypto";
import type { BlueprintUser } from "@/lib/notionService";

export type OtpRecord = {
  email: string;
  role: BlueprintUser["role"];
  code: string;
  expiresAt: number;
  attempts: number;
  user: BlueprintUser;
};

type StatelessOk = {
  ok: true;
  stateless: true;
  email: string;
  role: BlueprintUser["role"];
};

type StoredOk = {
  ok: true;
  stateless?: false;
  user: BlueprintUser;
};

const globalStore = globalThis as typeof globalThis & {
  __sbfOtpStore?: Map<string, OtpRecord>;
};

const store = globalStore.__sbfOtpStore ?? new Map<string, OtpRecord>();
globalStore.__sbfOtpStore = store;

const WINDOW_MS = 10 * 60 * 1000;
const keyFor = (email: string, role: string) => `${email.trim().toLowerCase()}::${role}`;
const windowSlot = (time = Date.now()) => Math.floor(time / WINDOW_MS);

const codeSecret = () => {
  const configured = process.env.PORTAL_CODE_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("PORTAL_CODE_SECRET is required for email sign-in.");
  }

  return process.env.NOTION_API_KEY?.trim() || "sbf-world-local-dev-code-secret";
};

const codeFor = (email: string, role: string, slot = windowSlot()) => {
  const digest = createHmac("sha256", codeSecret())
    .update(`${email.trim().toLowerCase()}::${role}::${slot}`)
    .digest();
  const value = (digest.readUInt32BE(0) % 900000) + 100000;
  return String(value).padStart(6, "0");
};

const matchesStatelessCode = (email: string, role: BlueprintUser["role"], code: string) => {
  const clean = code.trim();
  const current = windowSlot();
  return [current, current - 1].some((slot) => codeFor(email, role, slot) === clean);
};

export const createOtp = (user: BlueprintUser) => {
  // Use a deterministic short-lived code so Vercel serverless instances can verify
  // the code even when request-code and verify-code land on different functions.
  const code = codeFor(user.email, user.role);
  const record: OtpRecord = {
    email: user.email,
    role: user.role,
    code,
    expiresAt: Date.now() + WINDOW_MS,
    attempts: 0,
    user,
  };

  store.set(keyFor(user.email, user.role), record);
  return record;
};

export const verifyOtp = (
  email: string,
  role: BlueprintUser["role"],
  code: string,
): StoredOk | StatelessOk | { ok: false; error: string } => {
  const lookupKey = keyFor(email, role);
  const record = store.get(lookupKey);
  if (record) {
    if (Date.now() > record.expiresAt) {
      store.delete(lookupKey);
      return { ok: false as const, error: "This code has expired. Request a new code." };
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      store.delete(lookupKey);
      return { ok: false as const, error: "Too many attempts. Request a new code." };
    }

    if (record.code !== code.trim()) {
      return { ok: false as const, error: "Incorrect code." };
    }

    store.delete(lookupKey);
    return { ok: true as const, user: record.user };
  }

  if (matchesStatelessCode(email, role, code)) {
    return { ok: true as const, stateless: true as const, email: email.trim().toLowerCase(), role };
  }

  return { ok: false as const, error: "No active code found. Request a new code." };
};

export const roleRedirect = (role: BlueprintUser["role"]) => (role === "admin" ? "/admin" : "/dashboard");
