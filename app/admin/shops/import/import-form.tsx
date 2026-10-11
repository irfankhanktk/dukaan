"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatPhone } from "@/lib/format";
import { BUSINESS_TYPE_LABELS, parseShopsCsv, SHOPS_CSV_HEADER, type ShopImportRow } from "@/lib/menu-import";
import { findTakenSlugs, importShops } from "../actions";
import { FormError, Section } from "@/components/admin/wizard/stepper";

const EXAMPLE = `${SHOPS_CSV_HEADER}
Ali Bakers & Sweets,ali-bakers,bakery,Rawalpindi,Satellite Town,0300 1234567,Ali Raza,0300 1234567
Madina Kiryana,,grocery,Rawalpindi,Saddar,0312 7654321,Usman Ghani,0312 7654321`;

type Result = { created: { slug: string; id: string }[]; failed: { slug: string; error: string }[] };

export function ImportShopsForm() {
  const [text, setText] = useState("");
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => (text.trim() ? parseShopsCsv(text) : null), [text]);
  const slugKey = parsed?.rows.map((r) => r.raw.slug).join(",") ?? "";

  // Check which links already exist in the database (debounced).
  useEffect(() => {
    if (!slugKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const list = await findTakenSlugs(slugKey.split(",").filter(Boolean));
        if (!cancelled) setTaken(new Set(list));
      } catch {
        /* ignore — the server re-checks on import */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slugKey]);

  const rows = (parsed?.rows ?? []).map((r) =>
    r.row && taken.has(r.row.slug) ? { ...r, row: null, errors: [...r.errors, `Link "${r.row.slug}" is already taken`] } : r,
  );
  const valid = rows.filter((r): r is typeof r & { row: ShopImportRow } => !!r.row);
  const invalid = rows.length - valid.length;

  if (result) {
    return (
      <Section title="Import finished">
        <p className="text-sm">
          Created <strong>{result.created.length}</strong> shop{result.created.length === 1 ? "" : "s"} in Setup.
          {result.failed.length > 0 && <span className="text-feedback-danger"> {result.failed.length} failed.</span>}
        </p>
        {result.failed.length > 0 && (
          <ul className="mt-2 list-disc ps-5 text-sm text-feedback-danger">
            {result.failed.map((f) => (
              <li key={f.slug}>
                {f.slug}: {f.error}
              </li>
            ))}
          </ul>
        )}
        {result.created.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {result.created.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">/{c.slug}</span>
                <Link href={`/admin/shops/${c.id}/setup?step=1`} className="font-semibold text-brand-primary hover:underline">
                  Continue setup
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/shops?status=setup">See shops in setup</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setResult(null);
              setText("");
            }}
          >
            Import more
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-4">
      <Section
        title="1. Paste or upload the CSV"
        description={
          <>
            Columns: <code className="rounded bg-surface-bg px-1.5 py-0.5 text-xs">{SHOPS_CSV_HEADER}</code>. Slug is
            optional (made from the name). Business type: restaurant, bakery, home_kitchen, grocery, pharmacy,
            clothing or other.
          </>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <label className="cursor-pointer">
              <Upload /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setText(await f.text());
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setText(EXAMPLE)}>
            Fill example
          </Button>
        </div>
        <Textarea
          value={text}
          rows={7}
          spellCheck={false}
          aria-label="CSV"
          placeholder={EXAMPLE}
          className="font-mono text-sm"
          onChange={(e) => setText(e.target.value)}
        />
      </Section>

      {parsed?.error && <FormError message={parsed.error} />}

      {parsed && !parsed.error && rows.length > 0 && (
        <Section
          title="2. Check and import"
          description={
            <>
              <strong className="text-text-primary">{valid.length}</strong> ready
              {invalid > 0 && <span className="text-feedback-danger"> · {invalid} with errors (skipped)</span>}
            </>
          }
        >
          <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-surface-bg text-xs text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Area</th>
                  <th className="px-3 py-2">WhatsApp</th>
                  <th className="px-3 py-2">Owner (step 2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.line} className={r.row ? undefined : "bg-status-rejected-bg/60"}>
                    <td className="px-3 py-2 align-top text-text-secondary">{r.line}</td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">{r.raw.name || "—"}</p>
                      <p className="text-xs text-text-secondary">/{r.raw.slug}</p>
                      {r.errors.length > 0 && <p className="text-xs text-feedback-danger">{r.errors.join(" · ")}</p>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {r.row ? BUSINESS_TYPE_LABELS[r.row.business_type] : r.raw.business_type}
                    </td>
                    <td className="px-3 py-2 align-top">{[r.raw.area, r.raw.city].filter(Boolean).join(", ")}</td>
                    <td className="px-3 py-2 align-top">
                      {r.row ? formatPhone(r.row.whatsapp_number) : r.raw.whatsapp_number}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {r.raw.owner_name || "—"}
                      {r.raw.owner_phone && <span className="block text-xs text-text-secondary">{r.raw.owner_phone}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Owner names and phones are shown for reference only; create each owner&apos;s login in step 2 of the shop&apos;s
            setup.
          </p>
          {error && <div className="mt-3"><FormError message={error} /></div>}
          <Button
            type="button"
            className="mt-4 w-full sm:w-auto"
            size="lg"
            disabled={pending || valid.length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await importShops(valid.map((r) => r.row));
                if (!res.ok) setError(res.error);
                else {
                  setError(null);
                  setResult(res);
                }
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Import {valid.length} shop{valid.length === 1 ? "" : "s"}
          </Button>
        </Section>
      )}
    </div>
  );
}
