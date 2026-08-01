"use client";

import { useParams, useSearchParams } from "next/navigation";
import PortalRecordDetail from "@/components/notion/PortalRecordDetail";

export default function PortalRecordPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  return <PortalRecordDetail recordId={params.id} focusedField={search.get("field") || undefined} />;
}
