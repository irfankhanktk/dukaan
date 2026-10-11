"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { loginIdentifierToEmail } from "@/lib/login";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = loginIdentifierToEmail(identifier);
    if (!email) {
      setError("Enter your mobile number (e.g. 0300 1234567) or email.");
      return;
    }
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "Wrong phone number or password."
            : error.message,
        );
      }
      // /dashboard sends super admins on to /admin and new owners to set their password.
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Shopkeeper login</CardTitle>
          <CardDescription>Sign in to manage orders and your menu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="identifier">Mobile number</Label>
                <Input
                  id="identifier"
                  type="text"
                  inputMode="tel"
                  autoComplete="username"
                  placeholder="0300 1234567"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <p className="text-xs text-text-secondary">Admins can use their email instead.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-feedback-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </div>
            <p className="mt-4 text-center text-sm text-text-secondary">
              Forgot your password? Message Dukaan support on WhatsApp and we&apos;ll reset it.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
