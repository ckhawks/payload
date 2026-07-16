"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createLinkAction, type LinkState } from "@/lib/actions/links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultUrl } from "@/components/result-url";

export function LinkForm() {
  const [state, formAction, pending] = useActionState<LinkState, FormData>(
    createLinkAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.url) {
      toast.success("Link created");
      formRef.current?.reset();
    }
  }, [state.url]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="target">Destination URL</Label>
        <Input
          id="target"
          name="target"
          type="url"
          placeholder="https://example.com/very/long/link"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-slug">
          Custom slug{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="link-slug"
          name="slug"
          placeholder="leave blank for a random slug"
          autoComplete="off"
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Shorten"}
      </Button>

      {state.url && <ResultUrl url={state.url} />}
    </form>
  );
}
