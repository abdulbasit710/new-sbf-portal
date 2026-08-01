"use client";

import { useEffect, useState } from "react";
import { fetchGoldEmblem } from "@/lib/api/notion";
import type { GoldEmblemData } from "@/lib/notionService";

const ALT_TEXT = "SBF WORLD Official Gold Emblem";

function EmblemFallback({ message }: { message?: string }) {
  return (
    <div className="mx-auto flex h-64 w-full max-w-sm items-center justify-center rounded-2xl border border-gold/20 bg-ink-900/70 shadow-glow-sm">
      <div className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-gold/35 bg-gold/10 font-mono text-xl text-gold">
          SBF
        </div>
        <p className="mt-5 text-sm text-chalk">{ALT_TEXT}</p>
        {message && <p className="mx-auto mt-2 max-w-xs text-xs text-muted">{message}</p>}
      </div>
    </div>
  );
}

export default function SbfGoldEmblemSection() {
  const [emblem, setEmblem] = useState<GoldEmblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetchGoldEmblem()
      .then((data) => {
        if (active) {
          setEmblem(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load emblem.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative z-10 border-y border-white/[0.06] bg-ink-950 px-6 py-16">
      <div className="mx-auto max-w-7xl text-center">
        <span className="label-mono text-gold">Official Emblem</span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">
          {ALT_TEXT}
        </h2>
        <div className="mt-9">
          {loading && (
            <div className="mx-auto h-64 w-full max-w-sm animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
          )}

          {!loading && (!emblem || error || imageFailed) && (
            <EmblemFallback message={error ?? "The emblem image is not available right now."} />
          )}

          {!loading && emblem && !error && !imageFailed && (
            <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-gold/20 bg-ink-900/60 p-6 shadow-glow">
              <img
                src={emblem.imageUrl}
                alt={ALT_TEXT}
                className="mx-auto h-auto max-h-[420px] w-full object-contain"
                onError={() => setImageFailed(true)}
              />
              {emblem.caption && (
                <p className="mt-5 text-sm text-muted">{emblem.caption}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
