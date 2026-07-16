"use server";

import { redirect } from "next/navigation";
import { eq, sql, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, registrationCodes } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export type AuthState = { error?: string };

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 10, 5 * 60 * 1000)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Always run a verify to keep timing roughly constant for unknown users.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "0:0");

  if (!user || !ok) {
    return { error: "Invalid username or password." };
  }

  await createSession(user.id);
  redirect("/admin");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
    return { error: "Too many attempts. Try again later." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!USERNAME_RE.test(username)) {
    return {
      error: "Username must be 3–32 chars: letters, numbers, _ or -.",
    };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // First user ever becomes the admin and needs no code.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const isFirstUser = count === 0;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) return { error: "That username is taken." };

  let codeRow: { id: string } | undefined;
  if (!isFirstUser) {
    if (!code) return { error: "A registration code is required." };
    [codeRow] = await db
      .select({ id: registrationCodes.id })
      .from(registrationCodes)
      .where(
        and(
          eq(registrationCodes.code, code),
          isNull(registrationCodes.usedBy),
        ),
      )
      .limit(1);
    if (!codeRow) return { error: "Invalid or already-used code." };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash, isAdmin: isFirstUser })
    .returning({ id: users.id });

  if (codeRow) {
    await db
      .update(registrationCodes)
      .set({ usedBy: user.id, usedAt: new Date() })
      .where(eq(registrationCodes.id, codeRow.id));
  }

  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
