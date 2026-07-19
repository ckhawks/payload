"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  createFileRequestAction,
  type FileRequestState,
} from "@/lib/actions/file-requests";
import { REQUEST_DURATIONS } from "@/lib/file-requests";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResultUrl } from "@/components/result-url";

export function FileRequestForm() {
  const [state, formAction, pending] = useActionState<
    FileRequestState,
    FormData
  >(createFileRequestAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.url) {
      toast.success("Request link created");
      formRef.current?.reset();
    }
  }, [state.url]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="req-title">
          Title{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="req-title"
          name="title"
          placeholder="e.g. Send me your vacation photos"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="req-note">
          Note for uploaders{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="req-note"
          name="note"
          placeholder="Shown on the upload page."
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="req-duration">Stays open for</Label>
          <div className="relative">
            <select
              id="req-duration"
              name="duration"
              defaultValue="24h"
              className={cn(
                "border-input bg-background text-foreground h-9 w-full cursor-pointer appearance-none rounded-lg border pr-9 pl-2.5 text-sm outline-none transition-colors",
                "[&>option]:bg-background [&>option]:text-foreground",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
              )}
            >
              {REQUEST_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="req-slug">
            Custom name{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="req-slug"
            name="slug"
            placeholder="leave blank for a random link"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="req-max-uploads">
            Max files{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="req-max-uploads"
            name="maxUploads"
            type="number"
            min={1}
            step={1}
            placeholder="unlimited"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="req-max-size">
            Max total size (MB){" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="req-max-size"
            name="maxSizeMb"
            type="number"
            min={1}
            step="any"
            placeholder="unlimited"
            autoComplete="off"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="closeAfterFirst"
          className="border-input size-4 cursor-pointer rounded border accent-foreground"
        />
        Close automatically after the first upload
      </label>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create request link"}
      </Button>

      {state.url && <ResultUrl url={state.url} />}
    </form>
  );
}
