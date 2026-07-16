"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteObject } from "@/lib/storage/r2";
import { storeUpload } from "@/lib/files/store";

export type UploadState = { error?: string; url?: string };

export async function uploadFileAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const result = await storeUpload({
    file,
    customSlug: String(formData.get("slug") ?? ""),
    ownerId: user.id,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/files");
  return { url: result.url };
}

export async function deleteFileAction(id: string): Promise<void> {
  const user = await requireUser();
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return;
  if (row.ownerId !== user.id && !user.isAdmin) return;

  await deleteObject(row.storageKey).catch(() => {});
  await db
    .delete(files)
    .where(
      user.isAdmin ? eq(files.id, id) : and(eq(files.id, id), eq(files.ownerId, user.id)),
    );
  revalidatePath("/admin/files");
}
