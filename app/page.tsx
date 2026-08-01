"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HeroBackground from "@/components/landing/HeroBackground";
import SbfGoldEmblemSection from "@/components/SbfGoldEmblemSection";
import NotionSiteContentSection from "@/components/notion/NotionSiteContentSection";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icons";
import Logo from "@/components/ui/Logo";
import { fmtMoney } from "@/lib/data";

const STATS = [
  { label: "Capital Deployed", value: "$4.2B" },
  { label: "Active Mandates", value: "61" },
  { label: "Avg. Net IRR", value: "21.4%" },
  { label: "Institutions", value: "340+" },
];

const PILLARS = [
  {
    code: "RE",
    title: "Real Estate",
    desc: "Class-A acquisitions, development, and stabilized income.",
  },
  {
    code: "BIZ",
    title: "Business",
    desc: "Buy-and-build, growth equity, and operating platforms.",
  },
  {
    code: "CAP",
    title: "Capital",
    desc: "Private credit, structured facilities, and bridge financing.",
  },
  {
    code: "VAULT",
    title: "SBF Vault",
    desc: "Curated private-access opportunities and secondary positions.",
  },
];

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Nav */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-mono text-sm tracking-[0.3em] text-chalk">
            SBF·WORLD
          </span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#pillars" className="transition-colors hover:text-chalk">
            Pillars
          </a>
          <a href="#platform" className="transition-colors hover:text-chalk">
            Platform
          </a>
          <a href="#live-notion" className="transition-colors hover:text-chalk">
            Live CMS
          </a>
          <Link href="/sbf-vault" className="transition-colors hover:text-chalk">
            SBF Vault
          </Link>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-center justify-center px-6">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            {...fade(0)}
            className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            <span className="label-mono text-gold">
              Institutional Access · By Invitation
            </span>
          </motion.div>

          <motion.h1
            {...fade(0.1)}
            className="text-5xl font-semibold leading-[1.05] tracking-tight text-chalk sm:text-7xl"
          >
            SBF <span className="gold-text">WORLD OS</span>
          </motion.h1>

          <motion.p
            {...fade(0.2)}
            className="mx-auto mt-6 max-w-xl text-lg text-muted"
          >
            Institutional Capital Deployment System — a single operating layer
            for deal origination, underwriting, and capital allocation across
            every asset pillar.
          </motion.p>

          <motion.div
            {...fade(0.3)}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/login">
              <Button size="lg" icon={Icon.arrow(18)}>
                Enter Platform
              </Button>
            </Link>
            <Link href="/sbf-vault">
              <Button variant="outline" size="lg" icon={Icon.market(18)}>
                View SBF Vault
              </Button>
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            {...fade(0.45)}
            className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="bg-ink-900/80 px-5 py-6 backdrop-blur">
                <div className="font-mono text-2xl font-semibold text-chalk">
                  {s.value}
                </div>
                <div className="label-mono mt-1 text-muted">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <SbfGoldEmblemSection />

      <NotionSiteContentSection />

      {/* Pillars */}
      <section id="pillars" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <span className="label-mono text-gold">Four Capital Pillars</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-chalk sm:text-4xl">
            One system. Every asset class.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass glass-hover group rounded-2xl p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 font-mono text-sm text-gold">
                {p.code}
              </div>
              <h3 className="mt-5 text-lg font-medium text-chalk">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Platform band */}
      <section
        id="platform"
        className="relative z-10 mx-auto max-w-7xl px-6 pb-28"
      >
        <div className="glass overflow-hidden rounded-3xl p-10 sm:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="label-mono text-gold">The Operating System</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-chalk">
                From origination to deployment — governed by the CP engine.
              </h2>
              <p className="mt-4 text-muted">
                Every deal flows through a seven-stage checkpoint pipeline (CP1 →
                CP7), with institutional-grade underwriting, audit trails, and
                role-based access for members, investors, lenders, and partners.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Multi-stage CP checkpoint governance",
                  "Quantitative risk scoring & underwriting",
                  "Role-segmented portals & permissions",
                  "Full audit logging and system visibility",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-chalk/80">
                    <span className="text-gold">{Icon.shield(16)}</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 inline-block">
                <Button icon={Icon.arrow(18)}>Request Access</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Total AUM", fmtMoney(4_200_000_000)],
                ["Deals in Pipeline", "61"],
                ["Net IRR (TTM)", "21.4%"],
                ["Avg. Risk Score", "34 / 100"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-2xl border border-white/[0.06] bg-ink-850/60 p-5"
                >
                  <div className="label-mono text-muted">{k}</div>
                  <div className="mt-2 font-mono text-xl text-chalk">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="font-mono tracking-widest">SBF·WORLD OS</span>
          </div>
          <span>© 2026 SBF World Holdings. Confidential & Proprietary.</span>
        </div>
      </footer>
    </main>
  );
}
