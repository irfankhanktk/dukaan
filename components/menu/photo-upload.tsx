"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "product-photos";
const MAX_SIDE = 1600;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscale to ≤1600px and re-encode as WebP (JPEG fallback). Small images that
 * are already JPEG/WebP are uploaded unchanged.
 */
async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Browser can't decode it (e.g. HEIC on some browsers): upload as-is if allowed.
    if (ALLOWED.includes(file.type) && file.size <= MAX_BYTES) return file;
    throw new Error("This photo format isn't supported. Please use JPG, PNG or WebP.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 400_000 && (file.type === "image/jpeg" || file.type === "image/webp")) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    if (ALLOWED.includes(file.type) && file.size <= MAX_BYTES) return file;
    throw new Error("Could not process this photo");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") {
    // Safari < 17 can't encode WebP: JPEG on a white background (no alpha).
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  }
  bitmap.close();
  if (!blob) throw new Error("Could not process this photo");
  return blob;
}

export function PhotoUpload({
  shopId,
  value,
  onChange,
  onUploadingChange,
}: {
  shopId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose a photo");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const type = blob.type || file.type;
      if (!ALLOWED.includes(type)) throw new Error("Please use a JPG, PNG or WebP photo");
      if (blob.size > MAX_BYTES) throw new Error("Photo is too large (max 5 MB)");

      const path = `${shopId}/${crypto.randomUUID()}.${EXT[type]}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
      if (uploadError) throw new Error("Upload failed. Please try again.");
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        aria-label={value ? "Change photo" : "Upload photo"}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-brand-accent bg-brand-accent-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary md:h-36",
          dragging && "border-brand-primary bg-brand-primary-soft",
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL */}
            <img src={value} alt="Product photo" className="absolute inset-0 h-full w-full object-cover" />
            <span className="relative rounded-full bg-black/55 px-3 py-1.5 text-sm font-semibold text-text-inverse">
              {uploading ? "Uploading…" : "Change photo"}
            </span>
          </>
        ) : (
          <>
            {/* Mobile: centred icon + label */}
            <div className="flex flex-col items-center gap-1.5 text-status-new-fg md:hidden">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
              <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Add photo"}</span>
            </div>
            {/* Desktop: tile + text */}
            <div className="hidden w-full items-center gap-4 px-4 md:flex">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-card text-brand-accent">
                {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImageIcon className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {uploading ? "Uploading…" : "Drag a photo here or click to upload"}
                </p>
                <p className="text-xs text-text-secondary">JPG, PNG or WebP · square photos look best</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {error ? <p className="text-xs text-feedback-danger">{error}</p> : <span />}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-feedback-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove photo
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
