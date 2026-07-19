"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/files", label: "Files" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/gists", label: "Gists" },
  { href: "/admin/file-requests", label: "Requests" },
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
                "rounded-md px-2.5 py-1 text-[13px] transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "mr-0.5 text-base leading-none transition-opacity",
                  active ? "opacity-60" : "opacity-0",
                )}
              >
                ›
              </span>
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
