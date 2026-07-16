import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens, users, type User } from "@/lib/db/schema";

const PREFIX = "payload_";

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a new token. Returns the plaintext (shown once) and its stored form. */
export function generateApiToken(): {
  token: string;
  tokenHash: string;
  prefix: string;
} {
  const token = PREFIX + randomBytes(24).toString("hex");
  return {
    token,
    tokenHash: hashApiToken(token),
    prefix: token.slice(0, PREFIX.length + 6),
  };
}

/** Resolve a bearer token to its owner, updating last-used. Null if invalid. */
export async function getUserByApiToken(token: string): Promise<User | null> {
  if (!token.startsWith(PREFIX)) return null;
  const tokenHash = hashApiToken(token);

  const [row] = await db
    .select({ id: apiTokens.id, ownerId: apiTokens.ownerId })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;

  void db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, row.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, row.ownerId))
    .limit(1);
  return user ?? null;
}
