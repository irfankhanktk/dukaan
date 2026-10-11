"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  ...props
}: { text: string; label?: string; copiedLabel?: string } & Omit<ButtonProps, "onClick">) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      {...props}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Older browsers / insecure context: fall back to a hidden textarea.
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
