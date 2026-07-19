"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ClipboardEvent,
} from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import {
  submitToRequestAction,
  type SubmitState,
} from "@/lib/actions/file-requests";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function RequestUploadForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitToRequestAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    if (state.ok && state.fileName) {
      setSent((prev) => [state.fileName as string, ...prev]);
      formRef.current?.reset();
      setPicked(null);
    }
  }, [state.ok, state.fileName]);

  function setFile(file: File | undefined) {
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    setPicked({ name: file.name, size: file.size });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    setFile(e.dataTransfer.files?.[0]);
  }

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    const file = Array.from(e.clipboardData.items)
      .find((i) => i.kind === "file")
      ?.getAsFile();
    if (file) setFile(file);
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors outline-none",
          dragging
            ? "border-foreground/40 bg-muted"
            : "hover:border-foreground/20 hover:bg-muted/50 focus-visible:border-ring",
        )}
      >
        <Upload className="text-muted-foreground size-5" />
        {picked ? (
          <div className="text-sm">
            <span className="font-medium">{picked.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {formatBytes(picked.size)}
            </span>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            Drag &amp; drop, paste, or{" "}
            <span className="text-foreground">click to browse</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        name="file"
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPicked({ name: f.name, size: f.size });
        }}
        required
      />

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Uploading…" : "Upload"}
      </Button>

      {sent.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Sent
          </span>
          {sent.map((name, i) => (
            <div key={`${name}-${i}`} className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
              <span className="truncate font-mono text-[13px]">{name}</span>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
