"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Loader2, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { WhatsAppIcon } from "@/components/shop/whatsapp-icon";
import { formatPhone } from "@/lib/format";
import { generateTempPassword } from "@/lib/login";
import { saveOwner, type OwnerSaved } from "@/app/admin/shops/actions";
import { CopyButton } from "./copy-button";
import { FormError, Section, StickyBar } from "./stepper";

export type ExistingOwner = { name: string | null; phone: string | null };

export function StepOwner({
  shopId,
  existingOwner,
  prefill,
  defaultPassword,
}: {
  shopId: string;
  existingOwner: ExistingOwner | null;
  prefill: { name: string; phone: string };
  defaultPassword: string;
}) {
  const [changing, setChanging] = useState(!existingOwner);
  const [fullName, setFullName] = useState(prefill.name);
  const [phone, setPhone] = useState(prefill.phone);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(defaultPassword);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<OwnerSaved | null>(null);
  const [pending, startTransition] = useTransition();
  const next = `/admin/shops/${shopId}/setup?step=3`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await saveOwner({ shopId, fullName, phone, email, tempPassword: password });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      setErrors({});
      setSaved(res);
    });
  }

  if (saved) {
    const message = [
      `Login: ${saved.loginUrl}`,
      `Phone: ${saved.loginPhone}`,
      ...(saved.tempPassword ? [`Temporary password: ${saved.tempPassword}`] : []),
    ].join("\n");
    return (
      <div className="space-y-4">
        <Section
          title={saved.created ? "Owner login created" : "Existing login linked"}
          description={
            saved.created
              ? "Send these details to the owner. They will set their own password on first login."
              : "This phone number already had a Dukaan login. Its password was not changed."
          }
        >
          <dl className="grid gap-3 rounded-xl bg-brand-primary-soft p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Owner</dt>
              <dd className="font-semibold">{saved.ownerName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Login with phone</dt>
              <dd className="font-semibold">{saved.loginPhone}</dd>
            </div>
            {saved.tempPassword && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Temporary password</dt>
                <dd className="font-mono font-semibold">{saved.tempPassword}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Login page</dt>
              <dd className="truncate font-medium">{saved.loginUrl}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {saved.whatsappLink && (
              <Button asChild variant="whatsapp">
                <a href={saved.whatsappLink} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Send login details on WhatsApp
                </a>
              </Button>
            )}
            <CopyButton text={message} label="Copy details" />
          </div>
        </Section>
        <StickyBar>
          <Button asChild size="lg">
            <Link href={next}>Next: Delivery & hours</Link>
          </Button>
        </StickyBar>
      </div>
    );
  }

  if (!changing && existingOwner) {
    return (
      <div className="space-y-4">
        <Section title="Owner account" description="This shop already has an owner login.">
          <div className="flex items-center gap-3 rounded-xl border border-border p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{existingOwner.name ?? "Owner"}</p>
              <p className="text-sm text-text-secondary">
                {existingOwner.phone ? formatPhone(existingOwner.phone) : "No phone saved"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            To reset the owner&apos;s password, use the shop page&apos;s Owner &amp; access tab.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => setChanging(true)}>
            Change owner
          </Button>
        </Section>
        <StickyBar>
          <Button asChild size="lg">
            <Link href={next}>Next: Delivery & hours</Link>
          </Button>
        </StickyBar>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Section
        title={existingOwner ? "Change owner" : "Owner account"}
        description="The owner logs in to the dashboard with their mobile number and this temporary password."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Owner name" htmlFor="owner-name" error={errors.fullName}>
            <Input
              id="owner-name"
              value={fullName}
              autoComplete="off"
              placeholder="Ali Raza"
              aria-invalid={!!errors.fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <Field label="Mobile number (login)" htmlFor="owner-phone" error={errors.phone}>
            <Input
              id="owner-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              placeholder="0300 1234567"
              aria-invalid={!!errors.phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field
            label="Email (optional)"
            htmlFor="owner-email"
            error={errors.email}
            hint="Contact only — the owner logs in with their phone."
          >
            <Input
              id="owner-email"
              type="email"
              inputMode="email"
              value={email}
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="owner-password"
            error={errors.tempPassword}
            hint="Used only if this phone has no login yet."
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  id="owner-password"
                  value={password}
                  autoComplete="off"
                  spellCheck={false}
                  className="pl-10 font-mono"
                  aria-invalid={!!errors.tempPassword}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-12 w-12"
                aria-label="New password"
                onClick={() => setPassword(generateTempPassword())}
              >
                <RefreshCw />
              </Button>
            </div>
          </Field>
        </div>
      </Section>

      <FormError message={formError} />

      <StickyBar>
        {existingOwner && (
          <Button type="button" variant="secondary" size="lg" onClick={() => setChanging(false)}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Create login
        </Button>
      </StickyBar>
    </form>
  );
}
