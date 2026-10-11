"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Drop offline copies of dashboard pages (they can contain customer details).
    navigator.serviceWorker?.controller?.postMessage("dukaan:clear-pages");
    router.push("/auth/login");
  };

  return <Button variant="secondary" onClick={logout}>Log out</Button>;
}
