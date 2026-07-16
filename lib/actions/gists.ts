"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gists } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { randomSlug, normalizeCustomSlug } from "@/lib/slug";
import { isGistSlugTaken } from "@/lib/db/lookup";
import { env } from "@/lib/env";

export type GistState = { error?: string; url?: string };

export async function createGistAction(
  _prev: GistState,
  formData: FormData,
): Promise<GistState> {
  const user = await requireUser();

  const content = String(formData.get("content") ?? "");
  if (!content.trim()) return { error: "Gist content is empty." };

  const title = String(formData.get("title") ?? "").trim() || null;
  const language = String(formData.get("language") ?? "").trim() || null;

  const customInput = String(formData.get("slug") ?? "").trim();
  let slug: string;
  if (customInput) {
    const normalized = normalizeCustomSlug(customInput);
    if (!normalized) return { error: "Invalid custom slug." };
    slug = normalized;
    if (await isGistSlugTaken(slug)) {
      return { error: "That slug is already taken." };
    }
  } else {
    do {
      slug = randomSlug();
    } while (await isGistSlugTaken(slug));
  }

  await db.insert(gists).values({
    slug,
    title,
    content,
    language,
    ownerId: user.id,
  });

  revalidatePath("/admin/gists");
  return { url: `${env.APP_URL}/g/${slug}` };
}

export async function deleteGistAction(id: string): Promise<void> {
  const user = await requireUser();
  const [row] = await db.select().from(gists).where(eq(gists.id, id)).limit(1);
  if (!row) return;
  if (row.ownerId !== user.id && !user.isAdmin) return;

  await db
    .delete(gists)
    .where(
      user.isAdmin ? eq(gists.id, id) : and(eq(gists.id, id), eq(gists.ownerId, user.id)),
    );
  revalidatePath("/admin/gists");
}
