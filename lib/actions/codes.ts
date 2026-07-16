"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { registrationCodes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

// Human-friendly code, e.g. "K3M-9QP-7RT".
const codeChars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const codeGen = customAlphabet(codeChars, 9);

function formatCode(): string {
  const raw = codeGen();
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 9)}`;
}

export async function createCodeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim() || null;
  await db.insert(registrationCodes).values({
    code: formatCode(),
    note,
    createdBy: admin.id,
  });
  revalidatePath("/admin/codes");
}

export async function deleteCodeAction(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(registrationCodes).where(eq(registrationCodes.id, id));
  revalidatePath("/admin/codes");
}
