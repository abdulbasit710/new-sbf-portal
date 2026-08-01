"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchSiteContent } from "@/lib/api/siteContent";
import type { SiteContentItem } from "@/lib/notionService";

const MAX_ITEMS = 6;

function SiteContentSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function NotionContentCard({ item, index }: { item: SiteContentItem; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="glass glass-hover overflow-hidden rounded-2xl"
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono text-gold">{item.section}</span>
          {item.kicker && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted">
              {item.kicker}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-medium text-chalk">{item.title}</h3>
        {item.description && (
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gold/15 bg-gold/[0.04] px-2.5 py-1 text-[11px] text-gold/90"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {item.ctaUrl && (
          <a
            href={item.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex text-sm font-medium text-gold transition-colors hover:text-chalk"
          >
            {item.ctaLabel || "View details"} →
          </a>
        )}
      </div>
    </motion.article>
  );
}

export default function NotionSiteContentSection() {
  const [items, setItems] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchSiteContent()
      .then((data) => {
        if (!active) return;
        setItems(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load live SBF WORLD content.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => items.slice(0, MAX_ITEMS), [items]);

  if (!loading && (error || visibleItems.length === 0)) {
    return null;
  }

  return (
    <section id="live-notion" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 text-center">
        <span className="label-mono text-gold">Live SBF WORLD CMS</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-chalk sm:text-4xl">
          Updates pulled directly from SBF WORLD.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Add or edit rows in your connected SBF WORLD data source and this section updates automatically on the website.
        </p>
      </div>

      {loading ? (
        <SiteContentSkeleton />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item, index) => (
            <NotionContentCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
