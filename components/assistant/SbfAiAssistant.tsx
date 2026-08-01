"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icons";
import { useSession } from "@/lib/session";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const STARTERS = [
  "How does SBF WORLD work?",
  "How do I request access?",
  "What can a partner submit?",
  "Explain the portal workflow",
];

const cleanInput = (value: string) => value.replace(/\s+/g, " ").trim();

export default function SbfAiAssistant() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to SBF WORLD. Ask about access, portals, submissions, deal flow, or the platform workflow. I only answer from public and partner-safe context, because exposing CORE records to visitors would be digital malpractice.",
    },
  ]);

  const initials = useMemo(() => {
    if (!session?.name) return "S";
    return session.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";
  }, [session?.name]);

  const scrollToBottom = () => {
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 40);
  };

  const sendMessage = async (override?: string) => {
    const text = cleanInput(override ?? input);
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-8),
          pagePath: window.location.pathname,
          visitor: session
            ? {
                role: session.role,
                name: session.name,
                email: session.email,
                contactId: session.contactId,
                accessLevel: session.accessLevel,
              }
            : null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        answer?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "The assistant could not respond.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.answer || "I could not find enough public SBF WORLD context for that.",
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant unavailable.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            `${message} The portal is still running, but the assistant needs its AI/API settings checked. Humanity continues to overcomplicate chat bubbles.`,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open SBF WORLD assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[80] flex items-center gap-3 rounded-2xl border border-gold/30 bg-ink-900/95 px-4 py-3 text-left shadow-glow backdrop-blur transition hover:-translate-y-0.5 hover:border-gold/60"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gold-grad text-ink-950 shadow-glow-sm">
          <Logo size={32} />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-ink-950 bg-emerald-400" />
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-gold">SBF AI</span>
          <span className="block text-sm text-chalk">Live assistant</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 right-5 z-[90] flex h-[min(720px,calc(100vh-40px))] w-[min(430px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-gold/25 bg-ink-950/96 shadow-glow backdrop-blur-xl"
          >
            <div className="border-b border-white/[0.07] bg-gradient-to-br from-gold/10 via-white/[0.02] to-transparent p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-grad text-ink-950 shadow-glow-sm">
                    <Logo size={34} />
                  </div>
                  <div>
                    <div className="label-mono text-gold">SBF WORLD AI Concierge</div>
                    <h3 className="mt-1 text-base font-semibold text-chalk">Live platform assistant</h3>
                    <p className="mt-0.5 text-xs text-muted">Public + partner-safe SBF WORLD guidance</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close assistant"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-muted transition hover:border-gold/30 hover:text-chalk"
                >
                  ×
                </button>
              </div>
            </div>

            <div ref={listRef} className="assistant-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "border-gold/35 bg-gold/15 text-chalk"
                        : "border-white/[0.07] bg-white/[0.035] text-chalk/90"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-sm text-muted">
                    Reading SBF WORLD context… tiny gears, much ceremony.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/[0.07] p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    type="button"
                    key={starter}
                    onClick={() => sendMessage(starter)}
                    className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-muted transition hover:border-gold/35 hover:text-gold"
                  >
                    {starter}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask SBF WORLD…"
                  rows={2}
                  className="assistant-scrollbar min-h-[52px] flex-1 resize-none rounded-2xl border border-white/[0.08] bg-ink-900/80 px-4 py-3 text-sm text-chalk outline-none transition placeholder:text-muted focus:border-gold/45"
                />
                <button
                  type="submit"
                  disabled={loading || !cleanInput(input)}
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gold-grad text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Icon.arrow(18)}
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted">
                <span>Avatar: SBF WORLD</span>
                <span>{session ? initials : "Visitor"}</span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
