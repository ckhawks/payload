import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, links, gists } from "@/lib/db/schema";

/** Files and links share the bare "/<slug>" namespace, so check both. */
export async function isBareSlugTaken(slug: string): Promise<boolean> {
  const [f] = await db
    .select({ id: files.id })
    .from(files)
    .where(eq(files.slug, slug))
    .limit(1);
  if (f) return true;
  const [l] = await db
    .select({ id: links.id })
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1);
  return Boolean(l);
}

export async function isGistSlugTaken(slug: string): Promise<boolean> {
  const [g] = await db
    .select({ id: gists.id })
    .from(gists)
    .where(eq(gists.slug, slug))
    .limit(1);
  return Boolean(g);
}

export type BareResource =
  | { kind: "file"; row: typeof files.$inferSelect }
  | { kind: "link"; row: typeof links.$inferSelect };

/** Resolve a bare slug to a file or link, whichever matches. */
export async function resolveBareSlug(
  slug: string,
): Promise<BareResource | null> {
  const [f] = await db
    .select()
    .from(files)
    .where(eq(files.slug, slug))
    .limit(1);
  if (f) return { kind: "file", row: f };
  const [l] = await db
    .select()
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1);
  if (l) return { kind: "link", row: l };
  return null;
}
