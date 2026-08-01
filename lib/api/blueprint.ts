import type { BlueprintPageContent } from "@/lib/notionService";
import type { Role } from "@/lib/types";

interface BlueprintResponse {
  success: boolean;
  data?: {
    role: Role | "all";
    pages: BlueprintPageContent[];
  };
  error?: string;
}

export interface PortalSessionResponse {
  role: Role;
  email: string;
  name: string;
  relationshipType: string;
  contactId?: string;
  membershipTier?: string;
  accessLevel?: string;
  interests?: string;
  ndaStatus?: string;
  verificationStatus?: string;
  source: "notion" | "fallback";
  redirectPath?: string;
}

interface CodeRequestResponse {
  success: boolean;
  data?: {
    delivery: "screen";
    message: string;
    devCode?: string;
    email: string;
    role: Role;
    name: string;
  };
  error?: string;
}

interface CodeVerifyResponse {
  success: boolean;
  data?: PortalSessionResponse;
  error?: string;
}

export async function fetchBlueprintForRole(role: Role) {
  const response = await fetch(`/api/notion/blueprint?role=${role}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as BlueprintResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to load God's Blueprint.");
  }

  return payload.data.pages;
}

export async function requestPortalCode(email: string, role: Role) {
  const response = await fetch("/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  const payload = (await response.json()) as CodeRequestResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to generate portal code.");
  }

  return payload.data;
}

export async function verifyPortalCode(email: string, code: string, role: Role) {
  const response = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, role }),
  });
  const payload = (await response.json()) as CodeVerifyResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to verify portal code.");
  }

  return payload.data;
}

export async function loginWithBlueprint(email: string, password: string, role: Role) {
  return verifyPortalCode(email, password, role);
}
