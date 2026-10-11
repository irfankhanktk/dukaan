"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/dashboard/menu/actions";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`Delete "${productName}"? Old orders keep their details, but customers won't see it any more.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteProduct(productId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/dashboard/menu");
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="danger" onClick={onDelete} disabled={pending} className="w-full md:w-auto">
        <Trash2 /> {pending ? "Deleting…" : "Delete product"}
      </Button>
      {error && <p className="text-xs text-feedback-danger">{error}</p>}
    </div>
  );
}
