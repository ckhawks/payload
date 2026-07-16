import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { getSessionUserId } from "./session";

/** Current user or null. Cached per-request so multiple callers hit the DB once. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
});

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an admin; redirect to /login if anonymous, / if a non-admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/admin");
  return user;
}

export { getSessionUserId };
