import type { GoldEmblemData } from "@/lib/notionService";

interface GoldEmblemResponse {
  success: boolean;
  data?: GoldEmblemData;
  error?: string;
}

export async function fetchGoldEmblem() {
  const response = await fetch("/api/notion/gold-emblem", {
    cache: "no-store",
  });
  const payload = (await response.json()) as GoldEmblemResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to load SBF WORLD Official Gold Emblem.");
  }

  return payload.data;
}
