import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone, Search, Store } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { formatPhone, timeAgo } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { BUSINESS_TYPE_LABELS, PREFERRED_TIME_LABELS, type PreferredTime } from "@/lib/home-i18n";
import { REQUEST_STATUSES, type RequestStatus, type ShopRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AddRequestForm } from "@/components/admin/requests/add-request-form";
import { FollowUpInput, NotesEditor, StatusSelect } from "@/components/admin/requests/request-controls";
import {
  REQUEST_SOURCE_LABELS,
  REQUEST_STATUS_LABELS,
  toPkDateInput,
} from "@/components/admin/requests/labels";

export const metadata: Metadata = { title: "Shop requests" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function matches(r: ShopRequest, q: string): boolean {
  const needle = q.toLowerCase();
  const text = [r.owner_name, r.shop_name, r.city, r.area].filter(Boolean).join(" ").toLowerCase();
  if (text.includes(needle)) return true;
  const digits = q.replace(/\D/g, "").replace(/^0+/, "").replace(/^92/, "");
  return digits.length >= 3 && r.whatsapp_number.includes(digits);
}

function preferredLabel(p: string | null): string | null {
  if (!p) return null;
  return PREFERRED_TIME_LABELS[p as PreferredTime] ?? p;
}

function contactMessage(r: ShopRequest): string {
  return `Assalam-o-Alaikum ${r.owner_name}, this is Dukaan. Thank you for your interest in registering ${r.shop_name} on Dukaan. When is a good time to talk about setting up your shop?`;
}

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireSuperAdmin();
  const sp = await searchParams;
  const statusParam = first(sp.status);
  const status = (REQUEST_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as RequestStatus)
    : null;
  const q = first(sp.q).trim().slice(0, 100);

  const { data, error } = await admin.supabase
    .from("shop_requests")
    .select(
      "id, owner_name, shop_name, business_type, city, area, whatsapp_number, preferred_time, source, status, notes, follow_up_at, converted_shop_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<ShopRequest[]>();
  const all = data ?? [];

  const searched = q ? all.filter((r) => matches(r, q)) : all;
  const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  for (const r of searched) counts[r.status] += 1;
  const rows = status ? searched.filter((r) => r.status === status) : searched;

  const today = toPkDateInput(new Date());
  const view = rows.map((r) => {
    const followUp = toPkDateInput(r.follow_up_at);
    const open = r.status !== "registered" && r.status !== "not_interested";
    return {
      r,
      followUp,
      overdue: open && !!followUp && followUp < today,
      dueToday: open && followUp === today,
    };
  });

  const chipHref = (s: RequestStatus | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/admin/requests?${qs}` : "/admin/requests";
  };

  const chips: { key: RequestStatus | null; label: string; count: number }[] = [
    { key: null, label: "All", count: searched.length },
    ...REQUEST_STATUSES.map((s) => ({ key: s, label: REQUEST_STATUS_LABELS[s], count: counts[s] })),
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Shop requests</h1>
          <p className="text-sm text-text-secondary">
            Shopkeepers who asked to join Dukaan. Newest first.
          </p>
        </div>
        <AddRequestForm />
      </div>

      <nav aria-label="Filter by status" className="no-scrollbar -mx-4 mt-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-2">
          {chips.map((c) => {
            const active = c.key === status;
            return (
              <li key={c.key ?? "all"}>
                <Link
                  href={chipHref(c.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium",
                    active
                      ? "border-brand-primary bg-brand-primary text-text-inverse"
                      : "border-border bg-surface-card text-text-primary hover:bg-brand-primary-soft",
                  )}
                >
                  {c.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold",
                      active ? "bg-white/20" : "bg-surface-bg text-text-secondary",
                    )}
                  >
                    {c.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form action="/admin/requests" method="get" role="search" className="mt-4 flex max-w-xl gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="req-search" className="sr-only">
          Search requests
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-3.5 h-5 w-5 text-text-secondary" aria-hidden />
          <Input id="req-search" name="q" defaultValue={q} placeholder="Search name, shop or phone" className="ps-11" />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-feedback-danger/5 p-4 text-sm text-feedback-danger">
          Could not load requests: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="mt-6 rounded-card border border-dashed border-border bg-surface-card p-10 text-center text-text-secondary">
          {q || status ? "No requests match these filters." : "No shop requests yet."}
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Desktop table (lg+: the admin sidebar leaves too little room for 5 columns at md) */}
          <div className="mt-6 hidden overflow-hidden rounded-card border border-border bg-surface-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-bg text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">Request</th>
                  <th scope="col" className="px-4 py-3 text-start">Contact</th>
                  <th scope="col" className="w-48 px-4 py-3 text-start">Status</th>
                  <th scope="col" className="px-4 py-3 text-start">Notes</th>
                  <th scope="col" className="w-40 px-4 py-3 text-start">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {view.map(({ r, followUp, overdue, dueToday }) => (
                  <tr key={r.id} className={cn("align-top", r.status === "new" && "bg-status-new-bg/30")}>
                    <td className="px-4 py-4">
                      <RequestSummary r={r} />
                    </td>
                    <td className="px-4 py-4">
                      <ContactBlock r={r} />
                    </td>
                    <td className="space-y-3 px-4 py-4">
                      <StatusSelect id={`t-status-${r.id}`} requestId={r.id} status={r.status} />
                      <FollowUpInput
                        id={`t-follow-${r.id}`}
                        requestId={r.id}
                        value={followUp}
                        overdue={overdue}
                        dueToday={dueToday}
                      />
                    </td>
                    <td className="min-w-[220px] px-4 py-4">
                      <NotesEditor id={`t-notes-${r.id}`} requestId={r.id} notes={r.notes} />
                    </td>
                    <td className="px-4 py-4">
                      <ConvertAction r={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <ul className="mt-6 space-y-3 lg:hidden">
            {view.map(({ r, followUp, overdue, dueToday }) => (
              <li
                key={r.id}
                className={cn(
                  "rounded-card border bg-surface-card p-4",
                  r.status === "new" ? "border-brand-accent" : "border-border",
                )}
              >
                <RequestSummary r={r} />
                <div className="mt-3">
                  <ContactBlock r={r} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[11px] font-medium text-text-secondary">Status</p>
                    <StatusSelect id={`c-status-${r.id}`} requestId={r.id} status={r.status} />
                  </div>
                  <FollowUpInput
                    id={`c-follow-${r.id}`}
                    requestId={r.id}
                    value={followUp}
                    overdue={overdue}
                    dueToday={dueToday}
                  />
                </div>
                <div className="mt-3">
                  <NotesEditor id={`c-notes-${r.id}`} requestId={r.id} notes={r.notes} />
                </div>
                <div className="mt-2">
                  <ConvertAction r={r} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {all.length >= 1000 && (
        <p className="mt-4 text-xs text-text-secondary">Showing the 1,000 most recent requests.</p>
      )}
    </div>
  );
}

function RequestSummary({ r }: { r: ShopRequest }) {
  const place = [r.area, r.city].filter(Boolean).join(", ");
  return (
    <div>
      <p className="font-bold text-text-primary">{r.shop_name}</p>
      <p className="text-text-primary">{r.owner_name}</p>
      <p className="mt-1 text-xs text-text-secondary">
        {BUSINESS_TYPE_LABELS.en[r.business_type] ?? r.business_type}
        {place && ` · ${place}`}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {REQUEST_SOURCE_LABELS[r.source] ?? r.source} ·{" "}
        <time dateTime={r.created_at} title={new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}>
          {timeAgo(r.created_at)}
        </time>
      </p>
    </div>
  );
}

function ContactBlock({ r }: { r: ShopRequest }) {
  const pref = preferredLabel(r.preferred_time);
  return (
    <div>
      <p className="font-medium tabular-nums" dir="ltr">
        {formatPhone(r.whatsapp_number)}
      </p>
      {pref && <p className="text-xs text-text-secondary">Call: {pref}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <a href={`tel:+${r.whatsapp_number}`} aria-label={`Call ${r.owner_name}`}>
            <Phone aria-hidden /> Call
          </a>
        </Button>
        <Button asChild size="sm" variant="whatsapp">
          <a
            href={waLink(r.whatsapp_number, contactMessage(r))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${r.owner_name}`}
          >
            <MessageCircle aria-hidden /> WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}

function ConvertAction({ r }: { r: ShopRequest }) {
  if (r.converted_shop_id) {
    return (
      <Link
        href={`/admin/shops/${r.converted_shop_id}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-status-delivered-fg hover:underline"
      >
        Registered <ArrowRight className="h-4 w-4" aria-hidden /> View shop
      </Link>
    );
  }
  return (
    <Button asChild size="sm" className="w-full lg:w-auto">
      <Link href={`/admin/shops/new?request=${r.id}`}>
        <Store aria-hidden /> Convert to shop
      </Link>
    </Button>
  );
}
