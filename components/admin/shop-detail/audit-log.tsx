import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { resolveActors } from "./server-utils";
import { formatDateTime } from "./shared";

export const AUDIT_PAGE_SIZE = 50;

/** Keys that change on every write and only add noise to the diff. */
const NOISE_KEYS = new Set(["updated_at"]);

type Change = { key: string; before: unknown; after: unknown };

/** Only the keys that differ between before and after (insert → all set keys, delete → all old keys). */
export function diffEntry(before: Record<string, unknown> | null, after: Record<string, unknown> | null): Change[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: Change[] = [];
  for (const key of keys) {
    if (NOISE_KEYS.has(key)) continue;
    const b = before?.[key];
    const a = after?.[key];
    if (before && after) {
      if (JSON.stringify(b) === JSON.stringify(a)) continue;
    } else if ((a ?? b) === null || (a ?? b) === undefined) {
      continue; // insert/delete: skip empty columns
    }
    out.push({ key, before: before ? b : undefined, after: after ? a : undefined });
  }
  return out;
}

function show(v: unknown): string {
  if (v === undefined) return "";
  if (v === null) return "empty";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
}

function subjectOf(e: AuditEntry): string | null {
  const row = (e.after ?? e.before ?? {}) as Record<string, unknown>;
  if (typeof row.order_number === "number") return `Order #${row.order_number}`;
  for (const k of ["name", "full_name", "product_name"]) {
    if (typeof row[k] === "string" && row[k]) return row[k] as string;
  }
  if (e.entity === "payment" && typeof row.amount === "number") return `Rs ${row.amount}`;
  return null;
}

/**
 * Audit log list with filters applied by the caller and 50-per-page pagination.
 * Used by /admin/activity (all shops) and the shop detail "Activity log" tab.
 */
export async function AuditLogList({
  shopId,
  actionPrefix,
  actorId,
  page,
  pageHref,
  showShop,
}: {
  shopId?: string;
  actionPrefix?: string;
  actorId?: string;
  page: number;
  pageHref: (page: number) => string;
  showShop: boolean;
}) {
  const supabase = await createClient();
  const from = (page - 1) * AUDIT_PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);
  if (shopId) query = query.eq("shop_id", shopId);
  if (actionPrefix) query = query.like("action", `${actionPrefix.replace(/[%_\\]/g, "\\$&")}%`);
  if (actorId) query = query.eq("actor_id", actorId);

  const { data, count, error } = await query.returns<AuditEntry[]>();
  const entries = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const [actors, shopNames] = await Promise.all([
    resolveActors(entries.map((e) => e.actor_id)),
    (async () => {
      const map = new Map<string, { name: string }>();
      const ids = [...new Set(entries.map((e) => e.shop_id).filter((x): x is string => !!x))];
      if (!showShop || ids.length === 0) return map;
      const { data: shops } = await supabase.from("shops").select("id, name").in("id", ids);
      for (const s of shops ?? []) map.set(s.id as string, { name: s.name as string });
      return map;
    })(),
  ]);

  const now = new Date();

  if (error) {
    return (
      <p className="rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
        Couldn&apos;t load the activity log: {error.message}
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-text-secondary">
        {total === 0
          ? "No activity yet."
          : `${from + 1}–${from + entries.length} of ${total.toLocaleString("en-IN")} entries`}
      </p>

      {entries.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-card">
          {entries.map((e) => {
            const actor = e.actor_id ? actors.get(e.actor_id) : null;
            const changes = diffEntry(e.before, e.after);
            const subject = subjectOf(e);
            const shopName = e.shop_id ? shopNames.get(e.shop_id)?.name : null;
            return (
              <li key={e.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-col gap-1 px-4 py-3 hover:bg-surface-bg md:flex-row md:items-center md:gap-4 [&::-webkit-details-marker]:hidden">
                    <span className="shrink-0 text-xs text-text-secondary md:w-40" title={formatDateTime(e.created_at)}>
                      {formatDateTime(e.created_at)}
                      <span className="block text-[11px]">{timeAgo(e.created_at, now)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <code className="rounded-md bg-brand-primary-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-primary">
                          {e.action}
                        </code>
                        {subject && <span className="truncate text-sm font-medium">{subject}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-text-secondary">
                        {actor?.name ?? actor?.contact ?? (e.actor_id ? "Unknown user" : "System")}
                        {actor?.name && actor.contact ? ` · ${actor.contact}` : ""}
                        {e.actor_role ? ` · ${e.actor_role.replace("_", " ")}` : ""}
                        {showShop && e.shop_id && (
                          <>
                            {" · "}
                            <Link href={`/admin/shops/${e.shop_id}`} className="text-brand-primary hover:underline">
                              {shopName ?? "Deleted shop"}
                            </Link>
                          </>
                        )}
                      </span>
                    </span>
                    {changes.length > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                        {changes.length} field{changes.length === 1 ? "" : "s"}
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </span>
                    )}
                  </summary>
                  {changes.length > 0 ? (
                    <div className="overflow-x-auto border-t border-border bg-surface-bg px-4 py-3">
                      <table className="w-full min-w-[480px] text-left text-xs">
                        <thead className="text-text-secondary">
                          <tr>
                            <th className="w-40 py-1 pr-3 font-medium">Field</th>
                            <th className="py-1 pr-3 font-medium">Before</th>
                            <th className="py-1 font-medium">After</th>
                          </tr>
                        </thead>
                        <tbody className="align-top">
                          {changes.map((c) => (
                            <tr key={c.key} className="border-t border-border/60">
                              <td className="py-1.5 pr-3 font-mono text-text-secondary">{c.key}</td>
                              <td className="break-all py-1.5 pr-3 text-status-rejected-fg">{show(c.before)}</td>
                              <td className="break-all py-1.5 text-status-delivered-fg">{show(c.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="border-t border-border bg-surface-bg px-4 py-3 text-xs text-text-secondary">
                      No field changes recorded.
                    </p>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" /> Newer
          </PageLink>
          <span className="text-text-secondary">
            Page {page} of {pages}
          </span>
          <PageLink href={pageHref(page + 1)} disabled={page >= pages}>
            Older <ChevronRight className="h-4 w-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = "inline-flex h-9 items-center gap-1 rounded-btn border border-border bg-surface-card px-3 font-medium";
  if (disabled) return <span className={cn(cls, "opacity-40")}>{children}</span>;
  return (
    <Link href={href} className={cn(cls, "text-brand-primary hover:bg-brand-primary-soft")}>
      {children}
    </Link>
  );
}
