const normalizedKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const read = (fields: Record<string, string>, aliases: string[]) => {
  const entries = Object.entries(fields);
  for (const alias of aliases) {
    const exact = entries.find(([key]) => normalizedKey(key) === normalizedKey(alias));
    if (exact?.[1]?.trim()) return exact[1].trim();
  }
  return "";
};

const enabled = (value: string) => /^(yes|true|approved|visible|1)$/i.test(value.trim());

/** Exact asset-readiness rule published in New Build Zone — 8/5/2026. */
export const isCompleteNewBuildAsset = (fields: Record<string, string>) =>
  enabled(read(fields, ["Portal Visibility", "Portal Visible", "Visibility Allowed"])) &&
  (
    /^(full package)$/i.test(read(fields, ["Reveal Stage"])) ||
    (
      enabled(read(fields, ["Founder Approval", "Founder Approved"])) &&
      /^(teaser)$/i.test(read(fields, ["Reveal Stage"]))
    )
  ) &&
  Boolean(read(fields, ["Asking Price / Value", "Asking Price", "Value", "Price"])) &&
  Boolean(read(fields, ["Asset Type"]));
