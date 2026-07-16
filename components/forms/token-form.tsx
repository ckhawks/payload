"use client";

import { useActionState } from "react";
import { createTokenAction, type TokenState } from "@/lib/actions/tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";

export function TokenForm({ appUrl }: { appUrl: string }) {
  const [state, formAction, pending] = useActionState<TokenState, FormData>(
    createTokenAction,
    {},
  );

  const curl = state.token
    ? `curl -F "file=@photo.png" \\\n  -H "Authorization: Bearer ${state.token}" \\\n  ${appUrl}/api/upload`
    : "";

  const sharex = state.token
    ? JSON.stringify(
        {
          Version: "14.0.0",
          Name: "payload",
          DestinationType: "ImageUploader, FileUploader",
          RequestMethod: "POST",
          RequestURL: `${appUrl}/api/upload`,
          Headers: { Authorization: `Bearer ${state.token}` },
          Body: "MultipartFormData",
          FileFormName: "file",
          URL: "{json:url}",
        },
        null,
        2,
      )
    : "";

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            name="name"
            placeholder="Token name — e.g. laptop, ShareX"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create token"}
        </Button>
      </form>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      {state.token && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">
              Copy this token now — it won&apos;t be shown again.
            </p>
            <div className="bg-muted/50 mt-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <code className="truncate font-mono text-sm">{state.token}</code>
              <CopyButton value={state.token} />
            </div>
          </div>

          <Snippet title="curl" value={curl} />
          <Snippet title="ShareX config (.sxcu)" value={sharex} />
        </div>
      )}
    </div>
  );
}

function Snippet({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </span>
        <CopyButton value={value} />
      </div>
      <pre className="bg-muted/50 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
        {value}
      </pre>
    </div>
  );
}
