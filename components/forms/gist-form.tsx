"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createGistAction, type GistState } from "@/lib/actions/gists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResultUrl } from "@/components/result-url";

export function GistForm() {
  const [state, formAction, pending] = useActionState<GistState, FormData>(
    createGistAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.url) {
      toast.success("Gist created");
      formRef.current?.reset();
    }
  }, [state.url]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">
            Title{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input id="title" name="title" autoComplete="off" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="language">
            Language{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="language"
            name="language"
            placeholder="ts, py, sh…"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          rows={12}
          className="font-mono text-sm"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gist-slug">
          Custom slug{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="gist-slug"
          name="slug"
          placeholder="leave blank for a random slug"
          autoComplete="off"
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Create gist"}
      </Button>

      {state.url && <ResultUrl url={state.url} />}
    </form>
  );
}
