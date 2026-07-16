import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

const COOKIE_NAME = "payload_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Hash the cookie token before it touches the DB, so a DB leak can't be replayed. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a session for a user and set the cookie. Returns the raw token. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the userId for the current session, or null. Clears expired sessions. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return session.userId;
}

/** Destroy the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  store.delete(COOKIE_NAME);
}
