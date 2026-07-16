import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">payload</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to your account
          </p>
        </div>
        <AuthForm mode="login" needsCode={false} />
      </div>
    </main>
  );
}
