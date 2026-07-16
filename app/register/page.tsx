import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/admin");

  // First user ever is the admin and needs no registration code.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const isFirstUser = count === 0;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">payload</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isFirstUser
              ? "Create the admin account"
              : "Create your account with a registration code"}
          </p>
        </div>
        <AuthForm mode="register" needsCode={!isFirstUser} />
      </div>
    </main>
  );
}
