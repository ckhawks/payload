"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { generateApiToken } from "@/lib/auth/token";

export type TokenState = { error?: string; token?: string };

export async function createTokenAction(
  _prev: TokenState,
  formData: FormData,
): Promise<TokenState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || "token";

  const { token, tokenHash, prefix } = generateApiToken();
  await db.insert(apiTokens).values({
    name,
    tokenHash,
    prefix,
    ownerId: user.id,
  });

  revalidatePath("/admin/tokens");
  // Plaintext is returned exactly once; only its hash is stored.
  return { token };
}

export async function revokeTokenAction(id: string): Promise<void> {
  const user = await requireUser();
  await db
    .delete(apiTokens)
    .where(
      user.isAdmin
        ? eq(apiTokens.id, id)
        : and(eq(apiTokens.id, id), eq(apiTokens.ownerId, user.id)),
    );
  revalidatePath("/admin/tokens");
}
