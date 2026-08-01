import type { SiteContentItem } from "@/lib/notionService";

interface SiteContentResponse {
  success: boolean;
  data?: SiteContentItem[];
  error?: string;
}

export async function fetchSiteContent() {
  const response = await fetch("/api/notion/site-content", {
    cache: "no-store",
  });
  const payload = (await response.json()) as SiteContentResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? "Unable to load live Notion website content.");
  }

  return payload.data;
}
