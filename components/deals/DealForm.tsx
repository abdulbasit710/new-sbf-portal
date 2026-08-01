"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Pillar } from "@/lib/types";

const PILLARS: Pillar[] = ["Real Estate", "Business", "Capital", "SBF Vault"];

const STEPS = ["Deal Basics", "Financials", "Documents", "Review"];

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => void;
}

const field =
  "w-full rounded-lg border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm text-chalk placeholder:text-muted/60 outline-none transition-colors focus:border-gold/50 focus:shadow-glow-sm";
const label = "label-mono text-muted mb-1.5 block";

export default function DealForm({ open, onClose, onSubmit }: DealFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({
    pillar: "Real Estate",
  });

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    onSubmit(data);
    setStep(0);
    setData({ pillar: "Real Estate" });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit New Deal"
      sub="Originate a deal into the CP pipeline"
    >
      {/* Stepper */}
      <div className="mb-7 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-mono transition-all ${
                  i < step
                    ? "border-gold bg-gold/15 text-gold"
                    : i === step
                      ? "border-gold bg-gold-grad text-ink-950"
                      : "border-white/10 text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] tracking-wide ${i === step ? "text-chalk" : "text-muted"}`}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px flex-1 bg-white/[0.08]">
                <div
                  className="h-full bg-gold transition-all duration-500"
                  style={{ width: i < step ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.25 }}
          className="min-h-[230px]"
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className={label}>Deal Title</label>
                <input
                  className={field}
                  placeholder="e.g. Meridian Tower — Class A Acquisition"
                  value={data.title || ""}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Pillar</label>
                  <select
                    className={field}
                    value={data.pillar}
                    onChange={(e) => set("pillar", e.target.value)}
                  >
                    {PILLARS.map((p) => (
                      <option key={p} value={p} className="bg-ink-850">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Location</label>
                  <input
                    className={field}
                    placeholder="City, Country"
                    value={data.location || ""}
                    onChange={(e) => set("location", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Sponsor / Counterparty</label>
                <input
                  className={field}
                  placeholder="Sponsoring entity"
                  value={data.sponsor || ""}
                  onChange={(e) => set("sponsor", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Capital Requested (USD)</label>
                  <input
                    className={field}
                    placeholder="142,000,000"
                    value={data.value || ""}
                    onChange={(e) => set("value", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Target ROI (%)</label>
                  <input
                    className={field}
                    placeholder="19.4"
                    value={data.roi || ""}
                    onChange={(e) => set("roi", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Loan-to-Value (%)</label>
                  <input
                    className={field}
                    placeholder="62"
                    value={data.ltv || ""}
                    onChange={(e) => set("ltv", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Target Hold</label>
                  <input
                    className={field}
                    placeholder="5 Years"
                    value={data.hold || ""}
                    onChange={(e) => set("hold", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Thesis Summary</label>
                <textarea
                  className={`${field} h-24 resize-none`}
                  placeholder="Brief investment thesis…"
                  value={data.summary || ""}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Upload supporting documentation. Files are validated during CP2
                screening.
              </p>
              {["Investment Memorandum", "Financial Model", "Title / Cap Table"].map(
                (d) => (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-ink-850/50 px-4 py-3.5 transition-colors hover:border-gold/40"
                  >
                    <span className="text-sm text-chalk/80">{d}</span>
                    <span className="rounded-md border border-gold/30 px-2.5 py-1 text-[11px] text-gold">
                      Browse
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2.5 rounded-xl border border-white/[0.06] bg-ink-850/40 p-5">
              {[
                ["Title", data.title || "—"],
                ["Pillar", data.pillar],
                ["Location", data.location || "—"],
                ["Sponsor", data.sponsor || "—"],
                ["Capital", data.value ? `$${data.value}` : "—"],
                ["Target ROI", data.roi ? `${data.roi}%` : "—"],
                ["LTV", data.ltv ? `${data.ltv}%` : "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-sm last:border-0"
                >
                  <span className="text-muted">{k}</span>
                  <span className="text-chalk/90">{v}</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-gold/80">
                On submission this deal enters at CP1 — Origination.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <Button variant="ghost" onClick={step === 0 ? onClose : back}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={finish}>Submit Deal</Button>
        )}
      </div>
    </Modal>
  );
}
