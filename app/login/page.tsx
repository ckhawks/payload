import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Brand className="text-2xl" />
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to your account
          </p>
        </div>
        <AuthForm mode="login" needsCode={false} />
      </div>
    </main>
  );
}
