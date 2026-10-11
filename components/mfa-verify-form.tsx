"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Second step for super admins who enrolled an authenticator app (TOTP). */
export function MfaVerifyForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = factors.totp.find((f) => f.status === "verified");
      if (!factor) throw new Error("No authenticator app is set up for this account.");
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.replace(/\s/g, ""),
      });
      if (error) throw new Error("That code didn't work. Check the time on your phone and try again.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Two-step verification</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-feedback-danger">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Checking..." : "Verify"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
