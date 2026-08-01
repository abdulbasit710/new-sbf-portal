"use client";

import { useEffect, useMemo, useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import { fetchBlueprintForRole } from "@/lib/api/blueprint";
import type { BlueprintPageContent, NotionContentBlock } from "@/lib/notionService";
import type { Role } from "@/lib/types";

const MAX_BLOCKS = 4;

function blockPreview(block: NotionContentBlock) {
  if (block.type === "image" && block.imageUrl) {
    return (
      <img
        src={block.imageUrl}
        alt={block.caption || "God's Blueprint asset"}
        className="h-28 w-full rounded-lg object-cover"
      />
    );
  }

  if (block.type === "divider") {
    return <div className="h-px bg-white/[0.08]" />;
  }

  return (
    <p className="line-clamp-2 text-xs leading-relaxed text-muted">
      {block.checked !== undefined && (
        <span className={block.checked ? "text-emerald-300" : "text-gold"}>
          {block.checked ? "Complete: " : "Open: "}
        </span>
      )}
      {block.text}
    </p>
  );
}

export default function BlueprintPortalPanel({ role }: { role: Role }) {
  const [pages, setPages] = useState<BlueprintPageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchBlueprintForRole(role)
      .then((data) => {
        if (active) {
          setPages(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load God's Blueprint.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  const activePages = useMemo(
    () => pages.filter((page) => page.blocks.length > 0).slice(0, role === "admin" ? 8 : 5),
    [pages, role],
  );

  return (
    <Card className="mt-6">
      <CardHeader
        title="God's Blueprint"
        sub="Live SBF WORLD content mapped to this portal"
        action={<span className="label-mono text-muted">{pages.length || "-"} modules</span>}
      />
      <div className="p-5">
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4 text-sm text-muted">
            {error}
          </div>
        )}

        {!loading && !error && activePages.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-ink-850/50 p-4 text-sm text-muted">
            No SBF WORLD blocks are available yet. Share the listed Blueprint pages with the connection and restart the dev server.
          </div>
        )}

        {!loading && !error && activePages.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {activePages.map((page) => (
              <article
                key={page.key}
                className="rounded-xl border border-white/[0.06] bg-ink-850/45 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="label-mono text-gold">{page.category}</div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium text-chalk">
                      {page.title}
                    </h3>
                  </div>
                  <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-muted">
                    {page.blocks.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {page.blocks.slice(0, MAX_BLOCKS).map((block) => (
                    <div key={block.id}>{blockPreview(block)}</div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
