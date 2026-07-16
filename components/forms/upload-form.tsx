"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ClipboardEvent,
} from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { uploadFileAction, type UploadState } from "@/lib/actions/files";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultUrl } from "@/components/result-url";

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadFileAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (state.url) {
      toast.success("File uploaded");
      formRef.current?.reset();
      setPicked(null);
    }
  }, [state.url]);

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
        id="file"
        name="file"
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPicked({ name: f.name, size: f.size });
        }}
        required
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">
          Custom name{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="slug"
          name="slug"
          placeholder="leave blank for a random short link"
          autoComplete="off"
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Uploading…" : "Upload"}
      </Button>

      {state.url && <ResultUrl url={state.url} />}
    </form>
  );
}
