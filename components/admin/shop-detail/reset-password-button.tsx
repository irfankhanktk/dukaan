"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { resetOwnerPasswordAction } from "@/app/admin/shops/[id]/actions";

/** Sets a new temporary password for the owner and shows it with a "Send on WhatsApp" link. */
export function ResetPasswordButton({
  shopId,
  ownerName,
  variant = "secondary",
  size = "sm",
}: {
  shopId: string;
  ownerName: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword: string; whatsappLink: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!window.confirm(`Set a new temporary password for ${ownerName || "the owner"}? Their current password will stop working.`)) return;
    setError(null);
    setCopied(false);
    start(async () => {
      const res = await resetOwnerPasswordAction(shopId);
      if (!res.ok) setError(res.error);
      else setResult({ tempPassword: res.tempPassword, whatsappLink: res.whatsappLink });
    });
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full">
      <Button type="button" variant={variant} size={size} onClick={run} disabled={pending}>
        <KeyRound /> {pending ? "Resetting…" : "Reset password"}
      </Button>
      {error && <p className="mt-2 text-xs text-feedback-danger">{error}</p>}
      {result && (
        <div className="mt-3 rounded-xl border border-brand-primary/20 bg-brand-primary-soft p-3 text-sm">
          <p className="text-text-secondary">New temporary password</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded-lg bg-surface-card px-2 py-1 font-mono text-base font-semibold">
              {result.tempPassword}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-lg p-1.5 text-brand-primary hover:bg-surface-card"
              aria-label="Copy password"
            >
              <Copy className="h-4 w-4" />
            </button>
            {copied && <span className="text-xs text-brand-primary">Copied</span>}
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            The owner must set their own password the first time they log in.
          </p>
          {result.whatsappLink ? (
            <Button asChild variant="whatsapp" size="sm" className="mt-3">
              <a href={result.whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Send on WhatsApp
              </a>
            </Button>
          ) : (
            <p className="mt-2 text-xs text-feedback-danger">No valid owner phone — share the password in person.</p>
          )}
        </div>
      )}
    </div>
  );
}
