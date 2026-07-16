"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable over http; ignore.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} type="button">
      {copied ? (
        <Check className="size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {label}
    </Button>
  );
}
