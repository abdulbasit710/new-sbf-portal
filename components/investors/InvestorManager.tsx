"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardHeader } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { useSession } from "@/lib/session";
import type { InvestorManagerField, InvestorManagerSnapshot, PortalDatabaseRow } from "@/lib/notionService";

const valueFor = (row: PortalDatabaseRow, names: string[]) => {
  const fields = Object.entries(row.fields);
  for (const name of names) {
    const match = fields.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match?.[1]) return match[1];
  }
  return "";
};

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-muted/50 focus:border-gold/50";

function SchemaField({
  field,
  value,
  onChange,
}: {
  field: InvestorManagerField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-chalk">
        <input type="checkbox" checked={value === "true"} onChange={(event) => onChange(String(event.target.checked))} />
        Enabled
      </label>
    );
  }

  if (field.options.length) {
    return (
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
        <option value="">Select {field.label}</option>
        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  const inputType =
    field.type === "email" ? "email" :
    field.type === "url" ? "url" :
    field.type === "number" ? "number" :
    field.type === "date" ? "date" :
    field.type === "phone_number" ? "tel" : "text";

  return (
    <input
      className={fieldClass}
      type={inputType}
      value={value}
      required={field.required}
      placeholder={`Enter ${field.label}`}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function InvestorManager() {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<InvestorManagerSnapshot | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<PortalDatabaseRow | null>(null);

  const load = useCallback(async () => {
    if (!session?.email) return;
    setBusy("load");
    setError("");
    try {
      const response = await fetch(`/api/notion/investors?email=${encodeURIComponent(session.email)}&ts=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load investors.");
      setSnapshot(payload.data as InvestorManagerSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load investors.");
    } finally {
      setBusy("");
    }
  }, [session?.email]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return (snapshot?.rows ?? []).filter((row) =>
      [row.title, ...Object.values(row.fields)].join(" ").toLowerCase().includes(needle),
    ).slice(0, 8);
  }, [query, snapshot?.rows]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.email) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/notion/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.email, values }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to add investor.");
      setValues({});
      setShowForm(false);
      setNotice("Investor added to God’s Blueprint successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add investor.");
    } finally {
      setBusy("");
    }
  };

  const archive = async (row: PortalDatabaseRow) => {
    if (!session?.email || !window.confirm(`Remove “${row.title}” from the active investor list? The record remains recoverable in Notion.`)) return;
    setBusy(row.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/notion/investors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.email, rowId: row.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to remove investor.");
      setNotice("Investor archived in God’s Blueprint. The record can be restored from Notion.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove investor.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-gold/20">
        <CardHeader
          title="Investor Relationship Manager"
          sub="Add and archive Brad-scoped investors using the live fields from 04 — Investors, Buyers & Lenders — CORE."
          action={<Button onClick={() => setShowForm(true)} disabled={!snapshot || busy === "load"}>Add investor</Button>}
        />
        <div className="p-5">
          <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-medium text-chalk">Find an investor</div>
                <p className="mt-1 text-xs text-muted">Search by investor name, contact, or organization. Records stay hidden until you search.</p>
              </div>
              <div className="text-[11px] text-muted">{busy === "load" ? "Syncing with Notion…" : "Live God’s Blueprint lookup"}</div>
            </div>
            <input
              className={fieldClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type at least 2 characters, for example: Zachary or Kupperman…"
              autoComplete="off"
            />
          </div>
          {notice && <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</div>}
          {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

          {query.trim().length >= 2 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
              <div className="border-b border-white/[0.06] bg-white/[0.025] px-4 py-3 text-xs text-muted">
                {rows.length ? `${rows.length} matching investor${rows.length === 1 ? "" : "s"}` : "No matching investor found"}
              </div>
              {rows.map((row) => (
                <div key={row.id} role="button" tabIndex={0} onClick={() => setSelected(row)} onKeyDown={(event) => { if (event.key === "Enter") setSelected(row); }} className="flex cursor-pointer flex-col gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-gold/[0.05] last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-chalk">{row.title || "Untitled investor"}</h3>
                      <span className="rounded-full border border-gold/20 bg-gold/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                        {valueFor(row, ["Status", "Activation Status"]) || "Live"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {[
                        valueFor(row, ["Organization", "Company"]),
                        valueFor(row, ["Primary Contact"]),
                        valueFor(row, ["Capital Role", "Investor Role", "Role"]),
                      ].filter(Boolean).join(" · ") || "Capital relationship"}
                    </p>
                  </div>
                  <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                  <Button variant="outline" disabled={busy === row.id} onClick={() => void archive(row)}>
                    {busy === row.id ? "Archiving…" : "Archive"}
                  </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add investor to God’s Blueprint">
        <form className="space-y-5" onSubmit={save}>
          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-3 text-xs leading-5 text-gold/90">
            These fields are read live from the Notion schema. Partner ownership is applied automatically.
          </div>
          <div className="grid max-h-[58vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            {(snapshot?.fields ?? []).map((field) => (
              <label key={field.key} className="space-y-2">
                <span className="text-xs text-muted">{field.label}{field.required ? " *" : ""}</span>
                <SchemaField field={field} value={values[field.key] ?? ""} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving to Notion…" : "Add investor"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || "Investor record"} sub="Live record from 04 — Investors, Buyers & Lenders — CORE" width="max-w-4xl">
        {selected && <div className="grid max-h-[65vh] gap-3 overflow-y-auto md:grid-cols-2">{Object.entries(selected.fields).filter(([, value]) => Boolean(value)).map(([key, value]) => <div key={key} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="text-xs text-muted">{key}</div><div className="mt-1 whitespace-pre-wrap break-words text-sm text-chalk">{value}</div></div>)}</div>}
      </Modal>
    </>
  );
}
