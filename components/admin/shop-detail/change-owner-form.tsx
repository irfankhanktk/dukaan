"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { generateTempPassword } from "@/lib/login";
import { changeOwnerAction } from "@/app/admin/shops/[id]/actions";

type Done = { created: boolean; loginPhone: string; tempPassword: string | null; whatsappLink: string | null };

/**
 * Set (or replace) the shop's owner login. Owners log in with phone + password; a new login
 * gets the temporary password and must change it on first login (see CLAUDE.md).
 */
export function ChangeOwnerForm({
  shopId,
  defaultPassword,
  hasOwner,
}: {
  shopId: string;
  defaultPassword: string;
  hasOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [password, setPassword] = useState(defaultPassword);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (hasOwner && !window.confirm("Replace the current owner? The previous owner will lose access to this shop.")) {
      return;
    }
    setError(null);
    setDone(null);
    start(async () => {
      const res = await changeOwnerAction({
        shopId,
        fullName: String(fd.get("fullName") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        contactEmail: String(fd.get("contactEmail") ?? ""),
        tempPassword: password,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(res);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Owner name" htmlFor="owner-name">
        <Input id="owner-name" name="fullName" required minLength={2} maxLength={80} autoComplete="off" />
      </Field>
      <Field label="Mobile number (login)" htmlFor="owner-phone" hint="Used to log in, e.g. 0300 1234567">
        <Input id="owner-phone" name="phone" required inputMode="tel" placeholder="0300 1234567" autoComplete="off" />
      </Field>
      <Field label="Email (optional)" htmlFor="owner-email" hint="Contact only — not used to log in">
        <Input id="owner-email" name="contactEmail" type="email" autoComplete="off" />
      </Field>
      <Field
        label="Temporary password"
        htmlFor="owner-password"
        hint="Only used if this number has no login yet. Owner changes it on first login."
      >
        <div className="flex gap-2">
          <Input
            id="owner-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="font-mono"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={() => setPassword(generateTempPassword())}
            aria-label="Generate a new password"
          >
            <RefreshCw />
          </Button>
        </div>
      </Field>

      {error && <p className="text-sm text-feedback-danger md:col-span-2">{error}</p>}

      {done && (
        <div className="rounded-xl border border-brand-primary/20 bg-brand-primary-soft p-3 text-sm md:col-span-2">
          <p className="font-semibold text-brand-primary">
            {done.created ? "Login created" : "Existing login linked"} — owner logs in with {done.loginPhone}
          </p>
          {done.tempPassword ? (
            <p className="mt-1">
              Temporary password: <code className="font-mono font-semibold">{done.tempPassword}</code>
            </p>
          ) : (
            <p className="mt-1 text-text-secondary">This number already had a login, so its password was not changed.</p>
          )}
          {done.whatsappLink && (
            <Button asChild variant="whatsapp" size="sm" className="mt-3">
              <a href={done.whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Send login on WhatsApp
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : hasOwner ? "Change owner" : "Create owner login"}
        </Button>
      </div>
    </form>
  );
}
