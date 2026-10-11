"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** The shop's public link with copy / open / share-on-WhatsApp actions. */
export function ShareCard({ url, shopName }: { url: string; shopName: string }) {
  const [copied, setCopied] = useState(false);
  const display = url.replace(/^https?:\/\//, "");
  const shareText = `Order from ${shopName} online: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older Android WebViews: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-4 md:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Your shop link</h2>
      <p className="text-sm text-text-secondary">Share it with customers — orders come to your WhatsApp.</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-bg py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-brand-primary">{display}</span>
        <Button type="button" variant="secondary" size="sm" onClick={copy} aria-live="polite">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button asChild variant="secondary">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Open shop
          </a>
        </Button>
        <Button asChild variant="whatsapp">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 />
            Share on WhatsApp
          </a>
        </Button>
      </div>
    </Card>
  );
}
