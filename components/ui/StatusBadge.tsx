import type { DealStatus } from "@/lib/types";

const MAP: Record<
  DealStatus,
  { label: string; cls: string }
> = {
  active: { label: "Active", cls: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  review: {
    label: "In Review",
    cls: "text-gold bg-gold/10 border-gold/25",
  },
  approved: {
    label: "Approved",
    cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  },
  rejected: {
    label: "Rejected",
    cls: "text-red-300 bg-red-500/10 border-red-500/20",
  },
  funded: {
    label: "Funded",
    cls: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  },
};

export default function StatusBadge({ status }: { status: DealStatus }) {
  const m = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${m.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function RiskBadge({ value }: { value: number }) {
  const tier = value < 35 ? "low" : value < 60 ? "moderate" : "elevated";
  const cls =
    tier === "low"
      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
      : tier === "moderate"
        ? "text-gold bg-gold/10 border-gold/25"
        : "text-red-300 bg-red-500/10 border-red-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] ${cls}`}
    >
      {value}
      <span className="opacity-60">/100</span>
    </span>
  );
}

export function PillarTag({ pillar }: { pillar: string }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-chalk/70">
      {pillar}
    </span>
  );
}
