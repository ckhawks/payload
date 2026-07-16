"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { randomSlug, normalizeCustomSlug } from "@/lib/slug";
import { isBareSlugTaken } from "@/lib/db/lookup";
import { env } from "@/lib/env";

export type LinkState = { error?: string; url?: string };

export async function createLinkAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireUser();

  const target = String(formData.get("target") ?? "").trim();
  let url: URL;
  try {
    url = new URL(target);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("bad protocol");
    }
  } catch {
    return { error: "Enter a valid http(s) URL." };
  }

  const customInput = String(formData.get("slug") ?? "").trim();
  let slug: string;
  if (customInput) {
    const normalized = normalizeCustomSlug(customInput);
    if (!normalized) return { error: "Invalid custom slug." };
    slug = normalized;
    if (await isBareSlugTaken(slug)) {
      return { error: "That slug is already taken." };
    }
  } else {
    do {
      slug = randomSlug();
    } while (await isBareSlugTaken(slug));
  }

  await db.insert(links).values({
    slug,
    targetUrl: url.toString(),
    ownerId: user.id,
  });

  revalidatePath("/admin/links");
  return { url: `${env.APP_URL}/${slug}` };
}

export async function deleteLinkAction(id: string): Promise<void> {
  const user = await requireUser();
  const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!row) return;
  if (row.ownerId !== user.id && !user.isAdmin) return;

  await db
    .delete(links)
    .where(
      user.isAdmin ? eq(links.id, id) : and(eq(links.id, id), eq(links.ownerId, user.id)),
    );
  revalidatePath("/admin/links");
}
