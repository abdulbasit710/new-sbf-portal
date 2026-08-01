"use client";

import { useParams } from "next/navigation";
import InvestorBuyBoxes from "@/components/investors/InvestorBuyBoxes";

export default function InvestorBuyBoxesPage() {
  const params = useParams<{ id: string }>();
  return <InvestorBuyBoxes investorId={params.id} />;
}
