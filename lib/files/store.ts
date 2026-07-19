import "server-only";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { putObject } from "@/lib/storage/r2";
import { randomSlug, normalizeCustomSlug, extname } from "@/lib/slug";
import { isBareSlugTaken } from "@/lib/db/lookup";
import { createId } from "@/lib/id";
import { env } from "@/lib/env";

export type StoreResult =
  | { ok: true; url: string; slug: string }
  | { ok: false; error: string };

/**
 * Persist an uploaded file to R2 + Postgres. Shared by the admin Server Action
 * and the headless upload API so both behave identically.
 */
export async function storeUpload(opts: {
  file: File;
  customSlug?: string;
  ownerId: string;
  /** Set when the file arrived through a file request ("drop"). */
  requestId?: string;
}): Promise<StoreResult> {
  const { file, customSlug, ownerId, requestId } = opts;

  if (file.size === 0) return { ok: false, error: "Empty file." };
  if (file.size > env.MAX_UPLOAD_BYTES) {
    const mb = Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024));
    return { ok: false, error: `File exceeds the ${mb} MB limit.` };
  }

  const ext = extname(file.name);

  let slug: string;
  if (customSlug && customSlug.trim()) {
    const normalized = normalizeCustomSlug(customSlug.trim());
    if (!normalized) return { ok: false, error: "Invalid custom name." };
    slug = normalized.includes(".") ? normalized : normalized + ext;
    if (await isBareSlugTaken(slug)) {
      return { ok: false, error: "That name is already taken." };
    }
  } else {
    do {
      slug = randomSlug() + ext;
    } while (await isBareSlugTaken(slug));
  }

  const contentType = file.type || "application/octet-stream";
  const storageKey = `files/${createId()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await putObject(storageKey, bytes, contentType);

  await db.insert(files).values({
    slug,
    originalName: file.name,
    contentType,
    size: file.size,
    storageKey,
    ownerId,
    requestId,
  });

  return { ok: true, url: `${env.APP_URL}/${slug}`, slug };
}
