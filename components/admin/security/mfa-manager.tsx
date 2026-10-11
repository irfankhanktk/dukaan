"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };
type Enrolment = { factorId: string; qr: string; secret: string };

/**
 * TOTP two-step verification for the signed-in super admin (Supabase MFA — free, no SMS).
 * After a factor is verified, logins need the 6-digit code (/auth/mfa; requireSuperAdmin enforces aal2).
 */
export function MfaManager({ email }: { email: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().auth.mfa.listFactors();
    if (error) {
      setError(error.message);
      setFactors([]);
      return;
    }
    setFactors(
      (data.all as Factor[]).filter(
        (f) => (f as Factor & { factor_type?: string }).factor_type === "totp" && f.status === "verified",
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEnrol = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      // Clear abandoned (unverified) attempts so enrolment doesn't fail on duplicates.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of (list?.all ?? []) as (Factor & { factor_type?: string })[]) {
        if (f.factor_type === "totp" && f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
        issuer: "Dukaan",
      });
      if (error) throw error;
      setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start setup");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enrolment) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await createClient().auth.mfa.challengeAndVerify({
        factorId: enrolment.factorId,
        code: code.replace(/\s/g, ""),
      });
      if (error) throw new Error("That code didn't work. Check the time on your phone and try again.");
      setEnrolment(null);
      setNotice("Two-step verification is on. Next time you log in you'll be asked for a code.");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (enrolment) await createClient().auth.mfa.unenroll({ factorId: enrolment.factorId });
    setEnrolment(null);
    setCode("");
    setError(null);
  };

  const remove = async (f: Factor) => {
    const last = (factors?.length ?? 0) <= 1;
    const msg = last
      ? "Remove this authenticator? Your account will be protected by password only."
      : "Remove this authenticator?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: f.id });
    if (error) setError(error.message);
    else setNotice("Authenticator removed.");
    await load();
    router.refresh();
    setBusy(false);
  };

  const enabled = (factors?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">Two-step verification</h2>
              {factors === null ? null : enabled ? (
                <Badge variant="delivered">On</Badge>
              ) : (
                <Badge variant="new">Off</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              After your password, you&apos;ll enter a 6-digit code from an authenticator app on your phone. It&apos;s
              free (no SMS) and works with Google Authenticator, Microsoft Authenticator and similar apps.
            </p>
          </div>
        </div>

        {factors && factors.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                <Smartphone className="h-4 w-4 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.friendly_name || "Authenticator app"}</p>
                  <p className="text-xs text-text-secondary">Added {new Date(f.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => remove(f)} disabled={busy}>
                  <Trash2 /> Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!enrolment && factors !== null && (
          <Button type="button" className="mt-4" onClick={startEnrol} disabled={busy}>
            {busy ? "Please wait…" : enabled ? "Add another authenticator" : "Turn on two-step verification"}
          </Button>
        )}

        {notice && <p className="mt-3 text-sm text-brand-primary">{notice}</p>}
        {error && !enrolment && <p className="mt-3 text-sm text-feedback-danger">{error}</p>}
      </section>

      {enrolment && (
        <section className="rounded-card border border-brand-primary/30 bg-surface-card p-4 md:p-5">
          <h2 className="font-bold">Set up your authenticator app</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-text-secondary">
            <li>Open Google Authenticator or Microsoft Authenticator and tap &ldquo;+&rdquo;.</li>
            <li>Scan this QR code (or type the key below).</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URL from Supabase */}
            <img
              src={enrolment.qr}
              alt="QR code for your authenticator app"
              className="h-44 w-44 shrink-0 rounded-xl border border-border bg-white p-2"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-secondary">Can&apos;t scan? Enter this key for {email}:</p>
              <code className="mt-1 block break-all rounded-lg bg-surface-bg px-2 py-1.5 font-mono text-sm">
                {enrolment.secret}
              </code>
              <form onSubmit={verify} className="mt-4 space-y-3">
                <Field label="6-digit code" htmlFor="totp-code" error={error ?? undefined}>
                  <Input
                    id="totp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={7}
                    placeholder="123456"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6}>
                    {busy ? "Checking…" : "Verify and turn on"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
