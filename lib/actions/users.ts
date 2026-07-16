"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, files } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { deleteObject } from "@/lib/storage/r2";

/** Delete a user (cascades their links/gists). Admins can't delete themselves. */
export async function deleteUserAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (id === admin.id) return;

  // Remove their file bytes from R2 first; the rows cascade with the user.
  const owned = await db
    .select({ storageKey: files.storageKey })
    .from(files)
    .where(eq(files.ownerId, id));
  await Promise.all(owned.map((f) => deleteObject(f.storageKey).catch(() => {})));

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
