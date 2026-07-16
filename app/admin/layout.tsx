import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { LogoutButton } from "@/components/logout-button";
import { Brand } from "@/components/brand";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin">
              <Brand />
            </Link>
            <AdminNav isAdmin={user.isAdmin} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden font-mono text-[13px] sm:inline">
              {user.username}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
      <Toaster />
    </div>
  );
}
