"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/files", label: "Files" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/gists", label: "Gists" },
  { href: "/admin/tokens", label: "Tokens" },
  { href: "/admin/codes", label: "Codes", adminOnly: true },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items
        .filter((i) => !i.adminOnly || isAdmin)
        .map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
