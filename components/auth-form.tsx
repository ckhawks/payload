"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  mode,
  needsCode,
}: {
  mode: "login" | "register";
  needsCode: boolean;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>

      {mode === "register" && needsCode && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Registration code</Label>
          <Input
            id="code"
            name="code"
            placeholder="XXX-XXX-XXX"
            autoComplete="off"
            required
          />
        </div>
      )}

      {state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            Have a code?{" "}
            <Link
              href="/register"
              className="text-foreground underline underline-offset-4"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
