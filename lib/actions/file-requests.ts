"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileRequests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { storeUpload } from "@/lib/files/store";
import { randomSlug, normalizeCustomSlug } from "@/lib/slug";
import { isRequestSlugTaken } from "@/lib/db/lookup";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { REQUEST_DURATIONS, requestStatus } from "@/lib/file-requests";
import { env } from "@/lib/env";

export type FileRequestState = { error?: string; url?: string };

/** Owner creates a new file request ("drop") link. */
export async function createFileRequestAction(
  _prev: FileRequestState,
  formData: FormData,
): Promise<FileRequestState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const duration = REQUEST_DURATIONS.find(
    (d) => d.value === String(formData.get("duration") ?? ""),
  );
  if (!duration) return { error: "Choose how long the link stays open." };

  // Resolve the /r/<slug>, respecting an optional custom name.
  const custom = String(formData.get("slug") ?? "").trim();
  let slug: string;
  if (custom) {
    const normalized = normalizeCustomSlug(custom);
    if (!normalized) return { error: "Invalid custom name." };
    if (await isRequestSlugTaken(normalized)) {
      return { error: "That name is already taken." };
    }
    slug = normalized;
  } else {
    do {
      slug = randomSlug();
    } while (await isRequestSlugTaken(slug));
  }

  // Optional caps.
  let maxUploads: number | null = null;
  const rawUploads = String(formData.get("maxUploads") ?? "").trim();
  if (rawUploads) {
    const n = Number(rawUploads);
    if (!Number.isInteger(n) || n < 1) {
      return { error: "Max files must be a whole number of at least 1." };
    }
    maxUploads = n;
  }

  let maxBytes: number | null = null;
  const rawMb = String(formData.get("maxSizeMb") ?? "").trim();
  if (rawMb) {
    const mb = Number(rawMb);
    if (!Number.isFinite(mb) || mb <= 0) {
      return { error: "Max total size must be a positive number of MB." };
    }
    maxBytes = Math.round(mb * 1024 * 1024);
  }

  const closeAfterFirst = formData.get("closeAfterFirst") != null;

  await db.insert(fileRequests).values({
    slug,
    title,
    note,
    ownerId: user.id,
    expiresAt: new Date(Date.now() + duration.ms),
    maxUploads,
    maxBytes,
    closeAfterFirst,
  });

  revalidatePath("/admin/file-requests");
  return { url: `${env.APP_URL}/r/${slug}` };
}

export async function deleteFileRequestAction(id: string): Promise<void> {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(fileRequests)
    .where(eq(fileRequests.id, id))
    .limit(1);
  if (!row) return;
  if (row.ownerId !== user.id && !user.isAdmin) return;

  // Received files detach (files.request_id -> null via FK) rather than delete.
  await db
    .delete(fileRequests)
    .where(
      user.isAdmin
        ? eq(fileRequests.id, id)
        : and(eq(fileRequests.id, id), eq(fileRequests.ownerId, user.id)),
    );
  revalidatePath("/admin/file-requests");
}

/** Manually stop a request from accepting further uploads. */
export async function closeFileRequestAction(id: string): Promise<void> {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(fileRequests)
    .where(eq(fileRequests.id, id))
    .limit(1);
  if (!row) return;
  if (row.ownerId !== user.id && !user.isAdmin) return;
  if (row.closedAt) return;

  await db
    .update(fileRequests)
    .set({ closedAt: new Date() })
    .where(eq(fileRequests.id, id));
  revalidatePath("/admin/file-requests");
}

export type SubmitState = { error?: string; ok?: boolean; fileName?: string };

/**
 * PUBLIC, unauthenticated: an anonymous visitor uploads a file through a
 * request link. Gated only by the request being valid + open, plus a per-IP
 * rate limit. The file is stored owned by the request's owner.
 */
export async function submitToRequestAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "Missing upload link." };

  const ip = await clientIp();
  if (!rateLimit(`req:${slug}:${ip}`, 20, 10 * 60 * 1000)) {
    return { error: "Too many uploads from here. Try again in a bit." };
  }

  const [row] = await db
    .select()
    .from(fileRequests)
    .where(eq(fileRequests.slug, slug))
    .limit(1);
  if (!row) return { error: "This upload link doesn't exist." };

  const status = requestStatus(row);
  if (status === "expired") return { error: "This upload link has expired." };
  if (status === "closed") return { error: "This upload link is closed." };
  if (status === "full") {
    return { error: "This upload link isn't accepting any more files." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  if (row.maxBytes != null && row.receivedBytes + file.size > row.maxBytes) {
    return { error: "That file would exceed this link's total size limit." };
  }

  const result = await storeUpload({
    file,
    ownerId: row.ownerId,
    requestId: row.id,
  });
  if (!result.ok) return { error: result.error };

  await db
    .update(fileRequests)
    .set({
      uploadCount: sql`${fileRequests.uploadCount} + 1`,
      receivedBytes: sql`${fileRequests.receivedBytes} + ${file.size}`,
      closedAt: row.closeAfterFirst ? new Date() : row.closedAt,
    })
    .where(eq(fileRequests.id, row.id));

  revalidatePath("/admin/file-requests");
  revalidatePath(`/admin/file-requests/${row.id}`);
  return { ok: true, fileName: file.name };
}
