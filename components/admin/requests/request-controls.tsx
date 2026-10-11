"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/types";
import {
  updateRequestFollowUp,
  updateRequestNotes,
  updateRequestStatus,
} from "@/app/admin/requests/actions";
import { REQUEST_STATUS_CLASSES, REQUEST_STATUS_LABELS } from "./labels";

const smallField =
  "w-full rounded-xl border border-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/15 disabled:opacity-60";

/** Inline status select; saves immediately, reverts on failure. */
export function StatusSelect({
  id,
  requestId,
  status,
}: {
  id: string;
  requestId: string;
  status: RequestStatus;
}) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Status
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as RequestStatus;
            const prev = value;
            setValue(next);
            setError(null);
            startTransition(async () => {
              const res = await updateRequestStatus(requestId, next);
              if (!res.ok) {
                setValue(prev);
                setError(res.error);
              }
            });
          }}
          className={cn(
            "h-9 w-full appearance-none rounded-full border-0 pe-8 ps-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
            REQUEST_STATUS_CLASSES[value],
          )}
        >
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2 className="pointer-events-none absolute end-2.5 top-2.5 h-4 w-4 animate-spin" aria-hidden />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-feedback-danger">{error}</p>}
    </div>
  );
}

/** Follow-up date; saves on change. Overdue / due today highlighted (computed on the server). */
export function FollowUpInput({
  id,
  requestId,
  value,
  overdue,
  dueToday,
}: {
  id: string;
  requestId: string;
  value: string;
  overdue: boolean;
  dueToday: boolean;
}) {
  const [date, setDate] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-text-secondary">
        Follow-up
        {overdue && <span className="ms-1 font-bold text-feedback-danger">· Overdue</span>}
        {dueToday && !overdue && <span className="ms-1 font-bold text-status-new-fg">· Today</span>}
      </label>
      <input
        id={id}
        type="date"
        value={date}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = date;
          setDate(next);
          setError(null);
          startTransition(async () => {
            const res = await updateRequestFollowUp(requestId, next);
            if (!res.ok) {
              setDate(prev);
              setError(res.error);
            }
          });
        }}
        className={cn(
          smallField,
          "h-9",
          overdue && "border-feedback-danger bg-feedback-danger/5 text-feedback-danger",
          dueToday && !overdue && "border-brand-accent bg-brand-accent-soft",
        )}
      />
      {error && <p className="mt-1 text-xs text-feedback-danger">{error}</p>}
    </div>
  );
}

/** Notes textarea: saves on blur (when changed) or with the Save button. */
export function NotesEditor({
  id,
  requestId,
  notes,
}: {
  id: string;
  requestId: string;
  notes: string | null;
}) {
  const [saved, setSaved] = useState(notes ?? "");
  const [text, setText] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = text.trim() !== saved.trim();

  const save = () => {
    if (!dirty || pending) return;
    const value = text;
    setError(null);
    startTransition(async () => {
      const res = await updateRequestNotes(requestId, value);
      if (res.ok) {
        setSaved(value);
        setJustSaved(true);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Notes
      </label>
      <textarea
        id={id}
        value={text}
        rows={2}
        maxLength={4000}
        placeholder="Add notes…"
        onChange={(e) => {
          setText(e.target.value);
          setJustSaved(false);
        }}
        onBlur={save}
        className={cn(smallField, "min-h-[60px] py-2")}
      />
      <div className="mt-1 flex min-h-[20px] items-center gap-2 text-xs">
        {dirty && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={save}
            disabled={pending}
            className="font-semibold text-brand-primary hover:underline disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save notes"}
          </button>
        )}
        {!dirty && justSaved && (
          <span className="flex items-center gap-1 text-brand-whatsapp">
            <Check className="h-3.5 w-3.5" aria-hidden /> Saved
          </span>
        )}
        {error && <span className="text-feedback-danger">{error}</span>}
      </div>
    </div>
  );
}
