"use client";

import { useEffect, useState, useTransition } from "react";
import { FolderCog, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory, renameCategory } from "@/app/dashboard/menu/actions";

/**
 * Small modal / bottom sheet to add, rename and delete categories.
 * `variant="chip"` renders the dashed "+ Category" chip used in the filter row.
 */
export function CategoryManager({
  categories,
  productCounts,
  variant = "button",
}: {
  categories: Category[];
  productCounts: Record<string, number>;
  variant?: "button" | "chip";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {variant === "chip" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-dashed border-brand-primary/50 bg-brand-primary-soft px-4 text-sm font-semibold text-brand-primary"
        >
          + Category
        </button>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <FolderCog /> Categories
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-manager-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-card bg-surface-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-card md:pb-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="category-manager-title" className="text-lg font-bold">
                Categories
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-bg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AddCategory />
            <ul className="mt-4 flex flex-col gap-2">
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} count={productCounts[c.id] ?? 0} />
              ))}
              {categories.length === 0 && (
                <li className="py-4 text-center text-sm text-text-secondary">
                  No categories yet. Add one like “Cakes” or “Sweets”.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function AddCategory() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createCategory(name);
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setError(null);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category, e.g. Cakes"
          aria-label="New category name"
          maxLength={40}
          className="h-11"
        />
        <Button type="submit" disabled={pending || !name.trim()} className="shrink-0">
          <Plus /> Add
        </Button>
      </div>
      {error && <p className="text-xs text-feedback-danger">{error}</p>}
    </form>
  );
}

function CategoryRow({ category, count }: { category: Category; count: number }) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== category.name && name.trim() !== "";

  function rename() {
    startTransition(async () => {
      const res = await renameCategory(category.id, name);
      setError(res.ok ? null : res.error);
    });
  }

  function remove() {
    const msg =
      count > 0
        ? `Delete "${category.name}"? Its ${count} product${count === 1 ? "" : "s"} will become uncategorised.`
        : `Delete "${category.name}"?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteCategory(category.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className={cn("flex flex-col gap-1 rounded-xl border border-border p-2", pending && "opacity-60")}>
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && changed) {
              e.preventDefault();
              rename();
            }
          }}
          aria-label={`Category name for ${category.name}`}
          maxLength={40}
          className="h-10 border-transparent px-2 text-sm font-medium hover:border-border"
        />
        <span className="shrink-0 text-xs text-text-secondary">{count}</span>
        {changed ? (
          <Button type="button" size="sm" onClick={rename} disabled={pending}>
            Save
          </Button>
        ) : (
          <button
            type="button"
            aria-label={`Delete ${category.name}`}
            onClick={remove}
            disabled={pending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-feedback-danger/5 hover:text-feedback-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="px-2 text-xs text-feedback-danger">{error}</p>}
    </li>
  );
}
