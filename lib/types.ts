export type Role = "admin" | "member" | "investor" | "partner" | "lender";

export type Pillar = "Real Estate" | "Business" | "Capital" | "SBF Vault";

export type CPStage = "CP1" | "CP2" | "CP3" | "CP4" | "CP5" | "CP6" | "CP7";

export type DealStatus = "active" | "review" | "approved" | "rejected" | "funded";

export interface DealDocument {
  name: string;
  type: string;
  size: string;
  uploaded: string;
  status: "verified" | "pending" | "flagged";
}

export interface TimelineEvent {
  stage: CPStage;
  label: string;
  date: string;
  done: boolean;
}

export interface Deal {
  id: string;
  title: string;
  pillar: Pillar;
  stage: CPStage;
  status: DealStatus;
  risk: number; // 0-100
  value: number; // capital requested
  roi: number; // expected % return
  ltv: number; // loan-to-value %
  location: string;
  sponsor: string;
  updated: string;
  created: string;
  matchScore: number;
  summary: string;
  financials: { label: string; value: string }[];
  documents: DealDocument[];
}

export interface MarketListing {
  id: string;
  title: string;
  category: Pillar;
  price: number;
  location: string;
  match: number;
  risk: number;
  yield: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  level: "info" | "warning" | "critical";
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended" | "invited";
  lastSeen: string;
}
