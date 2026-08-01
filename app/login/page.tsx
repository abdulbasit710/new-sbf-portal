"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "@/lib/session";
import { requestPortalCode, verifyPortalCode } from "@/lib/api/blueprint";
import { ROLE_META } from "@/lib/data";
import type { Role } from "@/lib/types";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";

const ROLES: Role[] = ["admin", "member", "investor", "partner", "lender"];

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticatedSession } = useSession();
  const [role, setRole] = useState<Role>("admin");
  const [verifiedRole, setVerifiedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [screenCode, setScreenCode] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetCodeState = () => {
    setCodeSent(false);
    setVerifiedRole(null);
    setCode("");
    setNotice("");
    setScreenCode("");
    setCopyNotice("");
    setError("");
  };

  const requestCode = async () => {
    setError("");
    setNotice("");
    setScreenCode("");
    setCopyNotice("");

    if (!email.trim()) {
      setError("Enter the SBF WORLD email first.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPortalCode(email.trim(), role);
      setCodeSent(true);
      setVerifiedRole(response.role);
      setRole(response.role);
      setNotice(response.message);
      if (response.devCode) {
        setScreenCode(response.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate the code.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!screenCode) return;

    try {
      await navigator.clipboard.writeText(screenCode);
      setCopyNotice("Code copied. Paste it into Access Code below.");
    } catch {
      setCopyNotice("Copy failed. Select the code manually and paste it below.");
    }
  };

  const verifyCode = async () => {
    setError("");

    if (!email.trim()) {
      setError("Enter the SBF WORLD email first.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the generated access code first.");
      return;
    }

    const roleToVerify = verifiedRole ?? role;

    setLoading(true);
    try {
      const user = await verifyPortalCode(email.trim(), code.trim(), roleToVerify);
      setAuthenticatedSession(user);
      router.push(user.redirectPath ?? (user.role === "admin" ? "/admin" : "/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeSent) {
      await requestCode();
      return;
    }

    await verifyCode();
  };

  const field =
    "w-full rounded-lg border border-white/10 bg-ink-850 px-4 py-3 text-sm text-chalk placeholder:text-muted/60 outline-none transition-all focus:border-gold/50 focus:shadow-glow-sm";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.06] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative z-10 w-full max-w-md rounded-3xl p-8 shadow-glow"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Logo size={30} />
          <span className="font-mono text-sm tracking-[0.3em] text-chalk">
            SBF·WORLD OS
          </span>
        </Link>

        <h1 className="text-center text-xl font-semibold tracking-tight text-chalk">
          Secure Sign In
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted">
          Enter the SBF WORLD email, generate a screen access code, then open the assigned portal.
        </p>

        <div className="mt-7">
          <span className="label-mono mb-2.5 block text-muted">Access Profile</span>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  resetCodeState();
                }}
                className={`rounded-lg border px-2 py-2.5 text-center text-xs capitalize transition-all duration-200 ${
                  role === r
                    ? "border-gold/60 bg-gold/10 text-gold shadow-glow-sm"
                    : "border-white/10 text-muted hover:border-white/25 hover:text-chalk"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <motion.p
            key={role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 rounded-lg border border-white/[0.06] bg-ink-850/50 px-3 py-2 text-xs text-muted"
          >
            <span className="text-gold">{ROLE_META[role].tag}</span> — {ROLE_META[role].desc}
          </motion.p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label-mono mb-1.5 block text-muted">Email</label>
            <input
              type="email"
              className={field}
              placeholder={`${role}@sbf.world`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetCodeState();
              }}
            />
          </div>

          {codeSent && (
            <>
              {screenCode && (
                <div className="rounded-xl border border-gold/25 bg-gold/10 px-4 py-3">
                  <div className="label-mono mb-2 text-muted">Generated Access Code</div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-2xl font-semibold tracking-[0.35em] text-gold">
                      {screenCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="rounded-lg border border-gold/30 px-3 py-2 text-xs text-gold transition-colors hover:bg-gold/10"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    This code expires in 10 minutes. Paste it below to continue.
                  </p>
                  {copyNotice && <p className="mt-2 text-xs text-emerald-200">{copyNotice}</p>}
                </div>
              )}

              <div>
                <label className="label-mono mb-1.5 block text-muted">Access Code</label>
                <input
                  inputMode="numeric"
                  className={field}
                  placeholder="Paste generated code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" full size="lg">
            {loading
              ? codeSent
                ? "Verifying Code..."
                : "Checking SBF WORLD..."
              : codeSent
                ? `Open ${ROLE_META[verifiedRole ?? role].label} Portal`
                : "Generate Random Access Code"}
          </Button>

          {codeSent && (
            <button
              type="button"
              onClick={requestCode}
              className="w-full text-center text-xs text-muted transition-colors hover:text-gold"
              disabled={loading}
            >
              Generate new code
            </button>
          )}
        </form>

        {notice && (
          <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            SBF WORLD verified session
          </span>
          <Link href="/" className="transition-colors hover:text-chalk">
            ← Back home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
