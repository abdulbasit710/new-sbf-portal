import type { AdminCrmSnapshot } from "@/lib/notionService";

interface AdminCrmResponse {
  success: boolean;
  data?: AdminCrmSnapshot;
  error?: string;
}

interface AdminUpdateResponse {
  success: boolean;
  data?: { id: string; status: string; statusKey: string };
  error?: string;
}

export async function fetchAdminCrmSnapshot(email: string) {
  const response = await fetch(`/api/admin/crm?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as AdminCrmResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to load admin CRM.");
  }

  return payload.data;
}

export async function updateAdminCrmStatus(adminEmail: string, rowId: string, status: string) {
  const response = await fetch("/api/admin/crm/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminEmail, rowId, status }),
  });
  const payload = (await response.json()) as AdminUpdateResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to update CRM status.");
  }

  return payload.data;
}
