"use client";

import { CopyButton } from "@/components/copy-button";

/** Shows a freshly created public URL with a one-click copy. */
export function ResultUrl({ url }: { url: string }) {
  return (
    <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="truncate font-mono text-sm hover:underline"
      >
        {url}
      </a>
      <CopyButton value={url} />
    </div>
  );
}
